from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from api.models import Order

from .dispute_service import DisputeService
from .notifications import NotificationService
from .order_finance_service import OrderFinanceService
from .payment_service import PaymentService
from .penalties import PenaltyService


class InvalidOrderTransition(Exception):
    pass


class PermissionDeniedForTransition(Exception):
    pass


@dataclass
class OrderActor:
    user: object
    role: str


class OrderStatusService:
    def __init__(self):
        self.notifications = NotificationService()
        self.penalties = PenaltyService()
        self.finance = OrderFinanceService()
        self.payments = PaymentService()
        self.disputes = DisputeService(
            finance=self.finance,
            payments=self.payments,
            penalties=self.penalties,
        )

    def _lock_order(self, order_id):
        try:
            return (
                Order.objects.select_for_update()
                .select_related("dish__producer", "user")
                .get(id=order_id)
            )
        except Order.DoesNotExist:
            raise InvalidOrderTransition(f"Order {order_id} not found")

    def _check_seller_permission(self, actor: OrderActor, producer_user):
        """
        Проверяет права доступа продавца к заказу.
        """
        if actor.role not in ["SELLER", "ADMIN"]:
            raise PermissionDeniedForTransition()
        if actor.role == "SELLER" and producer_user and producer_user.id != actor.user.id:
            raise PermissionDeniedForTransition()

    @transaction.atomic
    def simulate_payment(self, order_id):
        order = self._lock_order(order_id)
        if order.status != "WAITING_FOR_PAYMENT":
            raise InvalidOrderTransition()
        if order.is_gift:
            order.status = "WAITING_FOR_RECIPIENT"
            order.acceptance_deadline = None
            if not order.recipient_token:
                from django.utils.crypto import get_random_string

                order.recipient_token = get_random_string(32)
            order.save(update_fields=["status", "acceptance_deadline", "recipient_token"])
            return order
        order.status = "WAITING_FOR_ACCEPTANCE"
        order.save(update_fields=["status"])
        return order

    @transaction.atomic
    def accept_by_seller(self, order_id, actor: OrderActor):
        order = self._lock_order(order_id)
        producer = getattr(order.dish, "producer", None)
        producer_user = getattr(producer, "user", None)
        self._check_seller_permission(actor, producer_user)
        if order.status != "WAITING_FOR_ACCEPTANCE":
            raise InvalidOrderTransition()
        now = timezone.now()
        if order.acceptance_deadline and now > order.acceptance_deadline:
            self._auto_cancel_not_accepted_locked(order)
            raise InvalidOrderTransition()
        order.status = "COOKING"
        order.accepted_at = now
        order.save(update_fields=["status", "accepted_at"])
        if producer:
            producer.consecutive_rejections = 0
            producer.save(update_fields=["consecutive_rejections"])
        self.notifications.order_accepted(order)
        return order

    @transaction.atomic
    def reject_by_seller(self, order_id, actor: OrderActor, reason=""):
        order = self._lock_order(order_id)
        producer = getattr(order.dish, "producer", None)
        producer_user = getattr(producer, "user", None)
        self._check_seller_permission(actor, producer_user)
        if order.status not in ["WAITING_FOR_ACCEPTANCE", "COOKING"]:
            raise InvalidOrderTransition()
        if producer:
            producer.rating = max(0, producer.rating - 1)
            producer.consecutive_rejections = producer.consecutive_rejections + 1
            if producer.consecutive_rejections >= 3:
                producer.is_banned = True
            producer.save(update_fields=["rating", "consecutive_rejections", "is_banned"])
        now = timezone.now()
        order.status = "CANCELLED"
        order.cancelled_at = now
        order.cancelled_by = "SELLER"
        order.cancelled_reason = reason
        order.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancelled_reason"])
        self.notifications.order_cancelled(order)
        return order

    @transaction.atomic
    def mark_ready_by_seller(self, order_id, actor: OrderActor):
        order = self._lock_order(order_id)
        producer = getattr(order.dish, "producer", None)
        producer_user = getattr(producer, "user", None)
        self._check_seller_permission(actor, producer_user)
        if order.status != "COOKING":
            raise InvalidOrderTransition()
        now = timezone.now()
        if order.is_gift:
            order.status = "READY_FOR_REVIEW"
        else:
            order.status = "READY_FOR_DELIVERY"
        order.ready_at = now
        order.save(update_fields=["status", "ready_at"])
        self.notifications.order_ready(order)
        return order

    @transaction.atomic
    def approve_photo(self, order_id, actor: OrderActor):
        order = self._lock_order(order_id)
        producer = getattr(order.dish, "producer", None)
        producer_user = getattr(producer, "user", None)
        self._check_seller_permission(actor, producer_user)
        if order.status != "READY_FOR_REVIEW":
            raise InvalidOrderTransition()
        order.status = "READY_FOR_DELIVERY"
        order.save(update_fields=["status"])
        return order

    @transaction.atomic
    def start_delivery(self, order_id, actor: OrderActor):
        order = self._lock_order(order_id)
        producer = getattr(order.dish, "producer", None)
        producer_user = getattr(producer, "user", None)
        self._check_seller_permission(actor, producer_user)
        if order.status not in ["READY_FOR_REVIEW", "READY_FOR_DELIVERY"]:
            raise InvalidOrderTransition()
        order.status = "DELIVERING"
        order.save(update_fields=["status"])
        self.notifications.order_delivering(order)
        return order

    @transaction.atomic
    def mark_arrived(self, order_id, actor: OrderActor):
        order = self._lock_order(order_id)
        producer = getattr(order.dish, "producer", None)
        producer_user = getattr(producer, "user", None)
        if actor.role not in ["SELLER", "ADMIN"]:
            raise PermissionDeniedForTransition()
        if actor.role == "SELLER" and producer_user and producer_user.id != actor.user.id:
            raise PermissionDeniedForTransition()
        if order.status != "DELIVERING":
            raise InvalidOrderTransition()
        now = timezone.now()
        order.status = "ARRIVED"
        order.delivered_at = now
        order.save(update_fields=["status", "delivered_at"])
        self.notifications.order_arrived(order)
        return order

    @transaction.atomic
    def complete_by_buyer(self, order_id, actor: OrderActor):
        order = self._lock_order(order_id)
        # Allow SELLER to complete orders (seller completes, not buyer)
        if actor.role not in ["SELLER", "BUYER", "ADMIN"]:
            raise PermissionDeniedForTransition()
        # Check seller permission
        if actor.role == "SELLER":
            producer = getattr(order.dish, "producer", None)
            producer_user = getattr(producer, "user", None)
            if producer_user and producer_user.id != actor.user.id:
                raise PermissionDeniedForTransition()
        # Check buyer permission
        if actor.role == "BUYER" and order.user_id != actor.user.id:
            raise PermissionDeniedForTransition()
        if order.status not in ["READY_FOR_REVIEW", "DELIVERING", "ARRIVED"]:
            raise InvalidOrderTransition()
        now = timezone.now()
        order.status = "COMPLETED"
        if not order.delivered_at:
            order.delivered_at = now
        order.save(update_fields=["status", "delivered_at"])
        producer = getattr(order.dish, "producer", None)
        if producer:
            if hasattr(producer, "sales_count"):
                value = producer.sales_count or 0
                producer.sales_count = value + 1
                producer.save(update_fields=["sales_count"])
        self.finance.on_completed(order)
        if hasattr(order.dish, "sales_count"):
            order.dish.sales_count = order.dish.sales_count + order.quantity
            order.dish.save()
        self.notifications.order_completed(order)
        return order

    @transaction.atomic
    def raise_dispute_by_buyer(self, order_id, actor: OrderActor, reason, description):
        order = self._lock_order(order_id)
        if actor.role not in ["BUYER", "ADMIN"]:
            raise PermissionDeniedForTransition()
        if actor.role == "BUYER" and order.user_id != actor.user.id:
            raise PermissionDeniedForTransition()
        if order.status not in ["ARRIVED", "COMPLETED"]:
            raise InvalidOrderTransition()
        description_value = (description or "").strip()
        if not description_value:
            raise InvalidOrderTransition()
        actor_role = actor.role if actor.role else "BUYER"
        self.disputes.open_for_order(
            order=order,
            opened_by_role=actor_role,
            opened_by_user=actor.user,
            reason=reason or "",
            description=description_value,
        )
        return order

    @transaction.atomic
    def resolve_dispute_by_admin(
        self,
        order_id,
        actor: OrderActor,
        resolution,
        compensation_amount=None,
        resolution_notes=None,
    ):
        order = self._lock_order(order_id)
        if actor.role != "ADMIN":
            raise PermissionDeniedForTransition()
        dispute = order.disputes.filter(status="OPEN").first()
        if not dispute:
            raise InvalidOrderTransition()
        try:
            updated_order, _ = self.disputes.resolve_for_order(
                order=order,
                dispute=dispute,
                resolution=resolution,
                compensation_amount=compensation_amount,
                resolution_notes=resolution_notes,
            )
        except ValueError:
            raise InvalidOrderTransition()
        return updated_order

    @transaction.atomic
    def cancel_order(self, order_id, actor: OrderActor, reason=""):
        order = self._lock_order(order_id)
        actor_role = actor.role
        if actor_role not in ["BUYER", "SELLER", "ADMIN"]:
            raise PermissionDeniedForTransition()
        if actor_role == "BUYER" and order.user_id != actor.user.id:
            raise PermissionDeniedForTransition()
        producer = order.dish.producer
        if actor_role in ["SELLER", "ADMIN"]:
            if order.status in ["COOKING", "WAITING_FOR_ACCEPTANCE"]:
                producer.rating = max(0, producer.rating - 1)
                producer.save(update_fields=["rating"])
        elif actor_role == "BUYER":
            if order.status == "READY_FOR_REVIEW":
                compensation = float(order.total_price) * 0.10
                producer.balance = float(producer.balance) + compensation
                producer.save()
        now = timezone.now()
        if actor_role in ["SELLER", "ADMIN"]:
            order.cancelled_by = "SELLER"
        elif actor_role == "BUYER":
            order.cancelled_by = "BUYER"
        order.cancelled_reason = reason
        order.cancelled_at = now
        order.status = "CANCELLED"
        order.save(update_fields=["status", "cancelled_by", "cancelled_reason", "cancelled_at"])
        logger.info(f"Order {order.id} cancelled by {actor_role}. Reason: {reason}")
        self.finance.on_cancelled(order)
        self.notifications.order_cancelled(order)
        return order

    @transaction.atomic
    def cancel_late_delivery_by_buyer(self, order_id, actor: OrderActor):
        order = self._lock_order(order_id)
        if actor.role not in ["BUYER", "ADMIN"]:
            raise PermissionDeniedForTransition()
        if actor.role == "BUYER" and order.user_id != actor.user.id:
            raise PermissionDeniedForTransition()
        if not order.accepted_at:
            raise InvalidOrderTransition()
        expected_finish = order.accepted_at + timedelta(minutes=order.estimated_cooking_time)
        late_threshold = expected_finish + timedelta(minutes=30)
        if timezone.now() <= late_threshold or order.status in ["COMPLETED", "CANCELLED", "READY_FOR_REVIEW"]:
            raise InvalidOrderTransition()
        now = timezone.now()
        order.status = "CANCELLED"
        order.cancelled_at = now
        order.cancelled_by = "SYSTEM"
        order.cancelled_reason = "Late delivery"
        order.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancelled_reason"])
        producer = order.dish.producer
        self.penalties.add_penalty(producer, 1)
        self.notifications.order_cancelled(order)
        return order

    @transaction.atomic
    def auto_cancel_not_accepted(self, order_id):
        order = self._lock_order(order_id)
        if order.status != "WAITING_FOR_ACCEPTANCE":
            return order
        now = timezone.now()
        if order.acceptance_deadline and now <= order.acceptance_deadline:
            return order
        self._auto_cancel_not_accepted_locked(order)
        return order

    def _auto_cancel_not_accepted_locked(self, order):
        producer = getattr(order.dish, "producer", None)
        now = timezone.now()
        order.status = "CANCELLED"
        order.cancelled_by = "SYSTEM"
        order.cancelled_reason = "Acceptance timeout"
        order.cancelled_at = now
        order.save(update_fields=["status", "cancelled_by", "cancelled_reason", "cancelled_at"])
        if producer:
            self.penalties.add_penalty(producer, 1)
        self.notifications.order_cancelled(order)
