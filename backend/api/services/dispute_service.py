import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from api.models import Dispute, Order, Payment, Producer, Profile

from .order_finance_service import OrderFinanceService
from .payment_service import PaymentService
from .penalties import PenaltyService
from .rating_service import RatingService

logger = logging.getLogger(__name__)


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
                    try:
                        self.payments.refund_payment(payment, amount=amount_to_refund)
                    except Exception as e:
                        logger.error(f"Failed to refund for dispute {dispute.id}: {e}")
                        raise  # Перебросить для отката транзакции

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

    @transaction.atomic
    def create_complaint_from_order(self, order: Order, user, complaint_text: str) -> Dispute:
        """
        Создать претензию после того, как покупатель отметил заказ как "неудовлетворительно".
        Отправить уведомление магазину.
        """
        if order.status not in ["ARRIVED", "COMPLETED"]:
            raise ValueError("Order must be in ARRIVED or COMPLETED status to create a complaint")

        if order.user != user:
            raise ValueError("Only the order owner can create a complaint")

        # Проверяем, нет ли уже активной претензии
        if order.disputes.filter(status__in=["OPEN", "WAITING_SELLER", "WAITING_SUPPORT"]).exists():
            raise ValueError("Order already has an active complaint")

        # Создаем претензию
        dispute = Dispute.objects.create(
            order=order,
            reason="QUALITY",
            description=complaint_text,
            opened_by="BUYER",
            opened_by_user=user,
            status="WAITING_SELLER",
        )

        # Обновляем статус заказа
        if order.status != "DISPUTE":
            order.status = "DISPUTE"
            order.save(update_fields=["status"])

        # Отправляем уведомление магазину
        self._notify_producer_about_complaint(dispute)

        logger.info(f"Complaint created for order {order.id} by user {user.id}")
        return dispute

    @transaction.atomic
    def accept_complaint(self, dispute: Dispute, producer: Producer) -> tuple[Order, Dispute]:
        """
        Магазин принимает претензию.
        Возврат средств покупателю.
        """
        if dispute.status != "WAITING_SELLER":
            raise ValueError("Complaint is not waiting for seller response")

        order = dispute.order
        if order.producer != producer:
            raise ValueError("Only the order producer can accept the complaint")

        # Возвращаем полную стоимость покупателю
        payment = self._get_payment_for_order(order)
        if payment:
            remaining = payment.amount - payment.refunded_amount
            if remaining > 0:
                self.payments.refund_payment(payment, amount=remaining)

        # Обновляем статус претензии
        dispute.status = "RESOLVED_BUYER_WON"
        dispute.resolution_notes = "Претензия принята магазином"
        dispute.resolved_at = timezone.now()
        dispute.compensation_amount = order.total_price
        dispute.save(update_fields=["status", "resolution_notes", "resolved_at", "compensation_amount"])

        # Обновляем статус заказа
        order.status = "CANCELLED"
        order.cancelled_at = timezone.now()
        order.cancelled_by = "SELLER"
        order.cancelled_reason = "Претензия принята"
        order.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancelled_reason"])

        # Добавляем штраф магазину
        self.penalties.add_penalty(producer, 1)
        self.rating.recalc_for_producer(producer)

        logger.info(f"Complaint {dispute.id} accepted by producer {producer.id}")
        return order, dispute

    @transaction.atomic
    def reject_complaint(self, dispute: Dispute, producer: Producer, reason: str) -> Dispute:
        """
        Магазин отклоняет претензию.
        Автоматически открывается спор.
        Создать Dispute с типом "COMPLAINT_REJECTED".
        """
        if dispute.status != "WAITING_SELLER":
            raise ValueError("Complaint is not waiting for seller response")

        order = dispute.order
        if order.producer != producer:
            raise ValueError("Only the order producer can reject the complaint")

        # Обновляем статус претензии - отклонена магазином
        dispute.status = "WAITING_SUPPORT"
        dispute.resolution_notes = f"Отклонено магазином. Причина: {reason}"
        dispute.save(update_fields=["status", "resolution_notes"])

        # Логируем отклонение
        logger.info(f"Complaint {dispute.id} rejected by producer {producer.id}. Reason: {reason}")

        return dispute

    @transaction.atomic
    def resolve_dispute(
        self,
        dispute: Dispute,
        resolution: str,
        winner: str,
    ) -> tuple[Order, Dispute]:
        """
        Разрешить спор.

        Если виноват магазин (winner="BUYER"):
        - Штраф 30% от заказа магазину
        - Возврат полной стоимости покупателю
        - Увеличить disputes_lost у магазина

        Если претензия необоснованна (winner="SELLER"):
        - Компенсация 10% магазину (платформа платит)
        - Увеличить disputes_lost у покупателя
        - Метка "N споров проиграно"
        """
        if dispute.status not in ["OPEN", "WAITING_SELLER", "WAITING_SUPPORT"]:
            raise ValueError("Dispute is not active")

        order = dispute.order
        producer = order.producer
        buyer = order.user

        if winner == "BUYER":
            # Покупатель прав
            # Штраф 30% от заказа магазину
            penalty_amount = order.total_price * Decimal("0.30")
            if producer.balance < penalty_amount:
                logger.warning(f"Producer {producer.id} has insufficient balance for penalty")
                penalty_amount = producer.balance  # Списываем все что есть
            producer.balance = producer.balance - penalty_amount
            producer.save(update_fields=["balance"])

            # Возврат полной стоимости покупателю
            payment = self._get_payment_for_order(order)
            if payment:
                remaining = payment.amount - payment.refunded_amount
                if remaining > 0:
                    self.payments.refund_payment(payment, amount=remaining)

            # Обновляем статус претензии
            dispute.status = "RESOLVED_BUYER_WON"
            dispute.resolution_notes = "Спор решен в пользу покупателя"
            dispute.compensation_amount = order.total_price
            dispute.resolved_at = timezone.now()
            dispute.save(update_fields=["status", "resolution_notes", "compensation_amount", "resolved_at"])

            # Обновляем статус заказа
            order.status = "CANCELLED"
            order.cancelled_at = timezone.now()
            order.cancelled_by = "ADMIN"
            order.cancelled_reason = "Спор решен в пользу покупателя"
            order.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancelled_reason"])

            # Добавляем штраф магазину
            self.penalties.add_penalty(producer, 2)
            self.rating.recalc_for_producer(producer)

            logger.info(f"Dispute {dispute.id} resolved in favor of buyer. Penalty: {penalty_amount}")

        elif winner == "SELLER":
            # Продавец прав
            # Компенсация 10% магазину (платформа платит)
            compensation = order.total_price * Decimal("0.10")
            producer.balance = producer.balance + compensation
            producer.save(update_fields=["balance"])

            # Увеличиваем disputes_lost у покупателя
            profile, _ = Profile.objects.get_or_create(user=buyer)
            profile.disputes_lost = profile.disputes_lost + 1
            profile.save(update_fields=["disputes_lost"])

            # Если много проигранных споров, отмечаем как проблемного покупателя
            if profile.disputes_lost >= 3:
                profile.is_problem_buyer = True
                profile.problem_buyer_reason = f"Проиграно {profile.disputes_lost} споров"
                profile.save(update_fields=["is_problem_buyer", "problem_buyer_reason"])

            # Обновляем статус претензии
            dispute.status = "RESOLVED_SELLER_WON"
            dispute.resolution_notes = "Спор решен в пользу продавца"
            dispute.compensation_amount = compensation
            dispute.resolved_at = timezone.now()
            dispute.save(update_fields=["status", "resolution_notes", "compensation_amount", "resolved_at"])

            # Начисляем деньги продавцу
            if order.payout_status == "NOT_ACCRUED":
                self.finance.on_completed(order)

            order.status = "COMPLETED"
            order.save(update_fields=["status"])

            logger.info(f"Dispute {dispute.id} resolved in favor of seller. Compensation: {compensation}")

        else:
            raise ValueError("Winner must be either 'BUYER' or 'SELLER'")

        return order, dispute

    def is_problem_buyer(self, user) -> bool:
        """
        Проверка по меткам проблемного покупателя.
        """
        try:
            profile = user.profile
            return profile.is_problem_buyer
        except Profile.DoesNotExist:
            return False

    def can_producer_refuse_buyer(self, producer: Producer, buyer) -> bool:
        """
        Может ли магазин отказать покупателю.
        """
        # Если покупатель помечен как проблемный, магазин может отказать
        if self.is_problem_buyer(buyer):
            return True

        # Проверяем, заблокирован ли покупатель этим магазином
        try:
            profile = buyer.profile
            if profile.blocked_by_producers:
                blocked_list = profile.blocked_by_producers if isinstance(profile.blocked_by_producers, list) else []
                return str(producer.id) in blocked_list
        except Profile.DoesNotExist:
            return False

        return False

    def _notify_producer_about_complaint(self, dispute: Dispute):
        """
        Отправить уведомление магазину о претензии.
        """
        from api.models import Notification

        from .notifications import NotificationService

        notification_service = NotificationService()

        # Создать уведомление для продавца
        if dispute.order and dispute.order.dish and dispute.order.dish.producer:
            producer = dispute.order.dish.producer
            if producer.user:
                Notification.objects.create(
                    user=producer.user,
                    title="Новая претензия к заказу",
                    message=f"Покупатель открыл спор по заказу #{dispute.order.id}",
                    type="DISPUTE",
                    link=f"/orders/{dispute.order.id}/",
                )

        logger.info(f"Notification sent to producer about complaint {dispute.id}")
