"""
Сервис для работы со штрафами и банами магазинов.
"""

import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from api.models import Dish, Order, Producer

from .notifications import NotificationService
from .payment_service import PaymentService

logger = logging.getLogger(__name__)


class PenaltyService:
    """Сервис для управления штрафами и банами магазинов."""

    def __init__(self):
        self.notification_service = NotificationService()
        self.payment_service = PaymentService()

    @transaction.atomic
    def apply_order_rejection_penalty(self, producer: Producer, order: Order) -> Order:
        """
        Применяет штраф за отклонение заказа.

        Args:
            producer: Магазин (Producer)
            order: Заказ

        Returns:
            Order: Обновленный заказ

        Raises:
            ValidationError: Если данные некорректны
        """
        if not producer:
            raise ValidationError("Producer is required")
        if not order:
            raise ValidationError("Order is required")

        # Увеличиваем consecutive_rejections
        producer.consecutive_rejections = F('consecutive_rejections') + 1

        # Увеличиваем penalty_points
        producer.penalty_points = F('penalty_points') + 1

        # Рассчитываем штраф 30% от стоимости заказа
        penalty_amount = order.total_price * Decimal("0.30")

        # Сохраняем штраф в заказе
        order.penalty_amount = penalty_amount
        order.penalty_reason = f"Отклонение заказа №{order.id}. {producer.consecutive_rejections} подряд."

        # Сохраняем изменения
        producer.save(update_fields=["consecutive_rejections", "penalty_points"])
        order.save(update_fields=["penalty_amount", "penalty_reason"])

        logger.info(
            f"Penalty applied to producer {producer.id}: "
            f"consecutive_rejections={producer.consecutive_rejections}, "
            f"penalty_points={producer.penalty_points}, "
            f"penalty_amount={penalty_amount}"
        )

        # Проверяем, нужно ли забанить магазин
        if producer.consecutive_rejections >= 3:
            self.ban_producer(producer, reason=f"{producer.consecutive_rejections} непринятых заказа подряд")

        return order

    @transaction.atomic
    def ban_producer(self, producer: Producer, reason: str = "3 непринятых заказа подряд") -> Producer:
        """
        Банит магазин.

        Args:
            producer: Магазин (Producer)
            reason: Причина бана

        Returns:
            Producer: Обновленный магазин
        """
        if not producer:
            raise ValidationError("Producer is required")

        # Устанавливаем флаг бана
        producer.is_banned = True
        producer.ban_reason = reason
        producer.banned_at = timezone.now()

        # Скрываем все товары магазина
        Dish.objects.filter(producer=producer).update(is_available=False)

        producer.save(update_fields=["is_banned", "ban_reason", "banned_at"])

        logger.warning(f"Producer {producer.id} ({producer.name}) banned. Reason: {reason}")

        # Отправляем уведомление продавцу
        if producer.user:
            self._send_ban_notification(producer, reason)

        return producer

    @transaction.atomic
    def clear_penalty_point(self, producer: Producer, order: Order) -> bool:
        """
        Уменьшает penalty_points на 1 и получает платёж 30% от стоимости заказа.

        Args:
            producer: Магазин (Producer)
            order: Заказ

        Returns:
            bool: True если успешно
        """
        if not producer:
            raise ValidationError("Producer is required")
        if not order:
            raise ValidationError("Order is required")

        if producer.penalty_points <= 0:
            logger.warning(f"Producer {producer.id} has no penalty points to clear")
            return False

        # Уменьшаем penalty_points
        producer.penalty_points -= 1
        producer.save(update_fields=["penalty_points"])

        # Получаем платёж 30% от стоимости заказа
        penalty_amount = order.total_price * Decimal("0.30")

        # Начисляем на баланс магазина
        producer.balance += penalty_amount
        producer.save(update_fields=["balance"])

        logger.info(
            f"Penalty point cleared for producer {producer.id}. "
            f"Amount credited: {penalty_amount}"
        )

        return True

    @transaction.atomic
    def unban_producer(self, producer: Producer) -> Producer:
        """
        Разбанивает магазин.

        Args:
            producer: Магазин (Producer)

        Returns:
            Producer: Обновленный магазин
        """
        if not producer:
            raise ValidationError("Producer is required")

        if not producer.is_banned:
            logger.warning(f"Producer {producer.id} is not banned")
            return producer

        # Устанавливаем флаг разбана
        producer.is_banned = False
        producer.unban_date = timezone.now()

        # Обнуляем consecutive_rejections
        producer.consecutive_rejections = 0

        # Показываем все товары магазина
        Dish.objects.filter(producer=producer).update(is_available=True)

        producer.save(update_fields=["is_banned", "unban_date", "consecutive_rejections"])

        logger.info(f"Producer {producer.id} ({producer.name}) unbanned")

        # Отправляем уведомление продавцу
        if producer.user:
            self._send_unban_notification(producer)

        return producer

    def _send_ban_notification(self, producer: Producer, reason: str):
        """Отправляет уведомление о бане продавцу."""
        try:
            from api.models import Notification

            Notification.objects.create(
                user=producer.user,
                title="Ваш магазин заблокирован",
                message=f"Ваш магазин '{producer.name}' был заблокирован. Причина: {reason}",
                type="BAN",
            )
            logger.info(f"Ban notification sent to producer {producer.id}")
        except Exception as e:
            logger.error(f"Failed to send ban notification: {e}", exc_info=True)
            # Не перебрасываем, чтобы не прерывать основной процесс

    def _send_unban_notification(self, producer: Producer):
        """Отправляет уведомление о разбане продавцу."""
        try:
            from api.models import Notification

            Notification.objects.create(
                user=producer.user,
                title="Ваш магазин разблокирован",
                message=f"Ваш магазин '{producer.name}' снова активен и может принимать заказы.",
                type="UNBAN",
            )
            logger.info(f"Unban notification sent to producer {producer.id}")
        except Exception as e:
            logger.error(f"Failed to send unban notification: {e}")
