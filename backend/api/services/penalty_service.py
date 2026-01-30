"""
Сервис для работы со штрафами и банами магазинов.
"""

import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from api.models import Dish, Order, Producer, Review

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

        Producer.objects.filter(pk=producer.pk).update(
            consecutive_rejections=F("consecutive_rejections") + 1,
            penalty_points=F("penalty_points") + 1,
        )
        producer.refresh_from_db(fields=["consecutive_rejections", "penalty_points"])

        # Рассчитываем штраф 30% от стоимости ТОВАРА (без доставки)
        dish_price = order.dish.price * order.quantity
        penalty_amount = dish_price * Decimal("0.30")

        order.penalty_amount = penalty_amount
        order.penalty_reason = (
            f"Отклонение заказа №{order.id}. {producer.consecutive_rejections} подряд."
        )

        order.save(update_fields=["penalty_amount", "penalty_reason"])

        # Создаем автоматический отзыв с 1 звездой
        from api.services.rating_service import RatingService

        # Проверяем, нет ли уже отзыва для этого заказа
        if not hasattr(order, 'review'):
            try:
                Review.objects.create(
                    order=order,
                    user=order.user,
                    producer=producer,
                    rating_taste=1,
                    rating_appearance=1,
                    rating_service=1,
                    rating_portion=1,
                    rating_packaging=1,
                    comment="Автоматический отзыв: заказ отклонен продавцом",
                    is_auto_generated=True,
                )

                # Пересчитываем рейтинг магазина
                rating_service = RatingService()
                rating_service.recalc_for_producer(producer)

                logger.info(f"Auto-generated review created for order {order.id}")
            except Exception as e:
                logger.error(f"Failed to create auto-generated review for order {order.id}: {e}")
        else:
            logger.warning(f"Review already exists for order {order.id}")

        logger.info(
            f"Penalty applied to producer {producer.id}: "
            f"consecutive_rejections={producer.consecutive_rejections}, "
            f"penalty_points={producer.penalty_points}, "
            f"penalty_amount={penalty_amount}"
        )

        # Определяем порог бана: 3 отказа обычно, 4 если оплачивал штраф в ЭТОМ месяце
        ban_threshold = 3
        if producer.last_penalty_payment_date:
            # Проверяем, была ли оплата в текущем месяце
            from dateutil.relativedelta import relativedelta
            current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            if producer.last_penalty_payment_date >= current_month_start:
                # Оплата была в этом месяце - даем +1 шанс
                ban_threshold = 4

        if producer.consecutive_rejections >= ban_threshold:
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
    def pay_penalty_fine(self, producer: Producer, order: Order) -> bool:
        """
        Оплачивает штраф: списывает 30% от стоимости непринятого заказа
        и уменьшает penalty_points на 1.

        Args:
            producer: Магазин (Producer)
            order: Заказ, за который был штраф

        Returns:
            bool: True если успешно

        Raises:
            ValidationError: Если недостаточно средств или некорректные данные
        """
        if not producer:
            raise ValidationError("Producer is required")
        if not order:
            raise ValidationError("Order is required")

        if producer.penalty_points <= 0:
            logger.warning(f"Producer {producer.id} has no penalty points to clear")
            raise ValidationError("У вас нет штрафных очков для оплаты")

        # Проверяем ограничение 1 раз в месяц
        if producer.last_penalty_payment_date:
            from dateutil.relativedelta import relativedelta
            month_ago = timezone.now() - relativedelta(months=1)

            if producer.last_penalty_payment_date > month_ago:
                next_available_date = producer.last_penalty_payment_date + relativedelta(months=1)
                raise ValidationError(
                    f"Оплата штрафа доступна только 1 раз в месяц. "
                    f"Следующая возможная дата: {next_available_date.strftime('%d.%m.%Y')}"
                )

        # Рассчитываем штраф 30% от стоимости ТОВАРА (без доставки)
        dish_price = order.dish.price * order.quantity
        penalty_amount = dish_price * Decimal("0.30")

        # Проверяем достаточность средств
        if producer.balance < penalty_amount:
            raise ValidationError(
                f"Недостаточно средств на балансе. "
                f"Требуется: {penalty_amount}, доступно: {producer.balance}"
            )

        # Списываем штраф с баланса магазина
        producer.balance -= penalty_amount
        producer.penalty_points -= 1
        producer.last_penalty_payment_date = timezone.now()
        producer.save(update_fields=["balance", "penalty_points", "last_penalty_payment_date"])

        # Удаляем автоматический отзыв, связанный с этим заказом
        from api.services.rating_service import RatingService

        try:
            auto_review = Review.objects.get(
                order=order,
                is_auto_generated=True
            )
            auto_review.delete()

            # Пересчитываем рейтинг после удаления отзыва
            rating_service = RatingService()
            rating_service.recalc_for_producer(producer)

            logger.info(f"Auto-generated review deleted for order {order.id}")
        except Review.DoesNotExist:
            logger.warning(f"No auto-generated review found for order {order.id}")
        except Exception as e:
            logger.error(f"Failed to delete auto-generated review for order {order.id}: {e}")

        logger.info(
            f"Penalty fine paid by producer {producer.id}. "
            f"Amount deducted: {penalty_amount}, "
            f"Remaining penalty_points: {producer.penalty_points}"
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
