from dataclasses import dataclass
from datetime import timedelta
from typing import Optional

from django.db import transaction
from django.utils import timezone

from api.models import Order, Payment
from .order_status import OrderStatusService
from .order_finance_service import OrderFinanceService
from .notifications import NotificationService
from .penalties import PenaltyService
from .payment_service import PaymentService
from .rating_service import RatingService


@dataclass
class SLAConfig:
    acceptance_minutes_default: int = 10
    cooking_grace_minutes: int = 10
    delivery_grace_minutes: int = 15


@dataclass
class SLACheckResult:
    phase: str
    is_overdue: bool
    hard_deadline: Optional[timezone.datetime]
    soft_deadline: Optional[timezone.datetime]
    seconds_left: Optional[int]


class SLAService:
    def __init__(
        self,
        config: Optional[SLAConfig] = None,
        status_service: Optional[OrderStatusService] = None,
        finance_service: Optional[OrderFinanceService] = None,
        notifications: Optional[NotificationService] = None,
        penalties: Optional[PenaltyService] = None,
        payments: Optional[PaymentService] = None,
        rating: Optional[RatingService] = None,
    ):
        self.config = config or SLAConfig()
        self.status = status_service or OrderStatusService()
        self.finance = finance_service or OrderFinanceService()
        self.notifications = notifications or NotificationService()
        self.penalties = penalties or PenaltyService()
        self.payments = payments or PaymentService()
        self.rating = rating or RatingService()

    def _now(self):
        return timezone.now()

    def check_acceptance(self, order: Order) -> SLACheckResult:
        hard_deadline = order.acceptance_deadline
        if not hard_deadline:
            return SLACheckResult(
                phase="ACCEPTANCE",
                is_overdue=False,
                hard_deadline=None,
                soft_deadline=None,
                seconds_left=None,
            )
        now = self._now()
        is_overdue = now > hard_deadline
        seconds_left = int((hard_deadline - now).total_seconds()) if not is_overdue else 0
        return SLACheckResult(
            phase="ACCEPTANCE",
            is_overdue=is_overdue,
            hard_deadline=hard_deadline,
            soft_deadline=None,
            seconds_left=seconds_left,
        )

    def check_cooking(self, order: Order) -> SLACheckResult:
        if not order.accepted_at or not order.estimated_cooking_time:
            return SLACheckResult(
                phase="COOKING",
                is_overdue=False,
                hard_deadline=None,
                soft_deadline=None,
                seconds_left=None,
            )
        base_finish = order.accepted_at + timedelta(minutes=order.estimated_cooking_time)
        hard_deadline = base_finish + timedelta(minutes=self.config.cooking_grace_minutes)
        now = self._now()
        is_overdue = now > hard_deadline
        seconds_left = int((hard_deadline - now).total_seconds()) if not is_overdue else 0
        return SLACheckResult(
            phase="COOKING",
            is_overdue=is_overdue,
            hard_deadline=hard_deadline,
            soft_deadline=base_finish,
            seconds_left=seconds_left,
        )

    def check_delivery(self, order: Order) -> SLACheckResult:
        delivery_minutes = getattr(order, "delivery_time_minutes", None)
        if not delivery_minutes:
            return SLACheckResult(
                phase="DELIVERY",
                is_overdue=False,
                hard_deadline=None,
                soft_deadline=None,
                seconds_left=None,
            )
        start = order.ready_at or order.accepted_at
        if not start:
            return SLACheckResult(
                phase="DELIVERY",
                is_overdue=False,
                hard_deadline=None,
                soft_deadline=None,
                seconds_left=None,
            )
        base_finish = start + timedelta(minutes=delivery_minutes)
        hard_deadline = base_finish + timedelta(minutes=self.config.delivery_grace_minutes)
        now = self._now()
        is_overdue = now > hard_deadline
        seconds_left = int((hard_deadline - now).total_seconds()) if not is_overdue else 0
        return SLACheckResult(
            phase="DELIVERY",
            is_overdue=is_overdue,
            hard_deadline=hard_deadline,
            soft_deadline=base_finish,
            seconds_left=seconds_left,
        )

    @transaction.atomic
    def enforce_acceptance(self, order: Order) -> Order:
        result = self.check_acceptance(order)
        if not result.is_overdue:
            return order
        if order.status != "WAITING_FOR_ACCEPTANCE":
            return order
        updated = self.status.auto_cancel_not_accepted(order.id)
        return updated

    @transaction.atomic
    def enforce_cooking(self, order: Order) -> Order:
        result = self.check_cooking(order)
        if not result.is_overdue:
            return order
        if order.status != "COOKING":
            return order
        return self._cancel_with_sla(order, phase="COOKING", reason="Cooking SLA violated")

    @transaction.atomic
    def enforce_delivery(self, order: Order) -> Order:
        result = self.check_delivery(order)
        if not result.is_overdue:
            return order
        if order.status not in ["READY_FOR_DELIVERY", "DELIVERING"]:
            return order
        return self._cancel_with_sla(order, phase="DELIVERY", reason="Delivery SLA violated")

    @transaction.atomic
    def _cancel_with_sla(self, order: Order, phase: str, reason: str) -> Order:
        now = self._now()
        producer = getattr(order.dish, "producer", None)
        order.status = "CANCELLED"
        order.cancelled_at = now
        order.cancelled_by = "SYSTEM"
        order.cancelled_reason = reason
        order.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancelled_reason"])
        if producer:
            self.penalties.add_penalty(producer, 1)
            self.rating.recalc_for_producer(producer)
        self.finance.on_cancelled(order)
        payment = order.current_payment
        if payment and payment.status in [
            Payment.Status.SUCCEEDED,
            Payment.Status.PARTIALLY_REFUNDED,
        ]:
            remaining = payment.amount - payment.refunded_amount
            if remaining > 0:
                self.payments.refund_payment(payment, amount=remaining)
        self.notifications.order_cancelled(order)
        return order

