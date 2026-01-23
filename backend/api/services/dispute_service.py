from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from api.models import Order, Dispute, Payment
from .order_finance_service import OrderFinanceService
from .payment_service import PaymentService
from .penalties import PenaltyService
from .rating_service import RatingService


class DisputeService:
    def __init__(
        self,
        finance: OrderFinanceService | None = None,
        payments: PaymentService | None = None,
        penalties: PenaltyService | None = None,
    ):
        self.finance = finance or OrderFinanceService()
        self.payments = payments or PaymentService()
        self.penalties = penalties or PenaltyService()
        self.rating = RatingService()

    @transaction.atomic
    def open_for_order(
        self,
        order: Order,
        opened_by_role: str,
        opened_by_user,
        reason: str,
        description: str,
    ) -> Dispute:
        if order.status not in ["ARRIVED", "COMPLETED"]:
            raise ValueError("Order is not eligible for dispute")

        if order.disputes.filter(
            status__in=[
                "OPEN",
                "WAITING_SELLER",
                "WAITING_SUPPORT",
            ]
        ).exists():
            raise ValueError("Order already has active dispute")

        valid_reasons = [choice[0] for choice in Dispute.REASON_CHOICES]
        if reason not in valid_reasons:
            reason = "OTHER"

        dispute = Dispute.objects.create(
            order=order,
            reason=reason,
            description=description,
            opened_by=opened_by_role,
            opened_by_user=opened_by_user,
            status="OPEN",
        )

        if order.status != "DISPUTE":
            order.status = "DISPUTE"
            order.save(update_fields=["status"])

        return dispute

    @transaction.atomic
    def resolve_for_order(
        self,
        order: Order,
        dispute: Dispute,
        resolution: str,
        compensation_amount: Decimal | None = None,
        resolution_notes: str | None = None,
    ) -> tuple[Order, Dispute]:
        if dispute.status not in ["OPEN", "WAITING_SELLER", "WAITING_SUPPORT"]:
            raise ValueError("Dispute is not active")

        if resolution == "buyer_won":
            status_value = "RESOLVED_BUYER_WON"
            refund_amount = compensation_amount or order.total_price
            order, dispute = self._resolve_buyer_won(
                order,
                dispute,
                refund_amount,
                resolution_notes,
            )
        elif resolution == "seller_won":
            status_value = "RESOLVED_SELLER_WON"
            order, dispute = self._resolve_seller_won(
                order,
                dispute,
                resolution_notes,
            )
        elif resolution == "partial_refund":
            if compensation_amount is None or compensation_amount <= 0:
                raise ValueError("Compensation amount is required for partial refund")
            status_value = "RESOLVED_PARTIAL"
            order, dispute = self._resolve_partial_refund(
                order,
                dispute,
                compensation_amount,
                resolution_notes,
            )
        else:
            raise ValueError("Unknown resolution")

        dispute.status = status_value
        dispute.resolved_at = timezone.now()
        if resolution_notes is not None:
            dispute.resolution_notes = resolution_notes
        dispute.save(update_fields=["status", "resolved_at", "resolution_notes"])

        return order, dispute

    def _get_payment_for_order(self, order: Order) -> Payment | None:
        payment = order.current_payment
        if payment:
            return payment
        return order.payments.filter(
            status__in=[
                Payment.Status.SUCCEEDED,
                Payment.Status.PARTIALLY_REFUNDED,
            ]
        ).last()

    def _resolve_buyer_won(
        self,
        order: Order,
        dispute: Dispute,
        refund_amount: Decimal,
        resolution_notes: str | None,
    ) -> tuple[Order, Dispute]:
        producer = order.dish.producer
        if producer:
            self.penalties.add_penalty(producer, 1)
            self.rating.recalc_for_producer(producer)

        payment = self._get_payment_for_order(order)
        if payment and refund_amount > 0:
            remaining = payment.amount - payment.refunded_amount
            if remaining > 0:
                amount_to_refund = min(remaining, refund_amount)
                if amount_to_refund > 0:
                    self.payments.refund_payment(payment, amount=amount_to_refund)

        profile = getattr(order.user, "profile", None)
        if profile:
            profile.save()

        dispute.compensation_amount = refund_amount
        if resolution_notes is not None:
            dispute.resolution_notes = resolution_notes

        order.status = "CANCELLED"
        order.save(update_fields=["status"])

        return order, dispute

    def _resolve_seller_won(
        self,
        order: Order,
        dispute: Dispute,
        resolution_notes: str | None,
    ) -> tuple[Order, Dispute]:
        profile = getattr(order.user, "profile", None)
        if profile:
            profile.disputes_lost = profile.disputes_lost + 1
            profile.save(update_fields=["disputes_lost"])

        producer = order.dish.producer
        if order.payout_status == "NOT_ACCRUED":
            self.finance.on_completed(order)

        if producer:
            compensation = order.total_price * Decimal("0.10")
            producer.balance = producer.balance + compensation
            producer.save(update_fields=["balance"])

        if resolution_notes is not None:
            dispute.resolution_notes = resolution_notes

        order.status = "COMPLETED"
        order.save(update_fields=["status"])

        return order, dispute

    def _resolve_partial_refund(
        self,
        order: Order,
        dispute: Dispute,
        compensation_amount: Decimal,
        resolution_notes: str | None,
    ) -> tuple[Order, Dispute]:
        producer = order.dish.producer
        if producer:
            self.penalties.add_penalty(producer, 1)
            self.rating.recalc_for_producer(producer)

        payment = self._get_payment_for_order(order)
        if payment and compensation_amount > 0:
            remaining = payment.amount - payment.refunded_amount
            if remaining > 0:
                amount_to_refund = min(remaining, compensation_amount)
                if amount_to_refund > 0:
                    self.payments.refund_payment(payment, amount=amount_to_refund)

        dispute.compensation_amount = compensation_amount
        if resolution_notes is not None:
            dispute.resolution_notes = resolution_notes

        if order.status == "DISPUTE":
            order.status = "COMPLETED"
            order.save(update_fields=["status"])

        return order, dispute
