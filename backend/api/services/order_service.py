"""
Сервис для бизнес-логики заказов.
Включает функции для автосохранения черновиков, повторного заказа,
принятия, отклонения и отмены заказов.
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from ..models import Dish, Order, OrderDraft, Producer, Profile
from .notifications import NotificationService
from .payment_service import PaymentService
from .penalty_service import PenaltyService

logger = logging.getLogger(__name__)


class OrderService:
    """Сервис для работы с заказами."""

    @staticmethod
    def save_order_draft(
        user,
        dish_id: str,
        quantity: int = 1,
        delivery_type: str = "BUILDING",
        delivery_address_text: str = "",
        apartment: str = "",
        entrance: str = "",
        floor: str = "",
        intercom: str = "",
        delivery_latitude: Optional[float] = None,
        delivery_longitude: Optional[float] = None,
        delivery_price: Decimal = Decimal("0.00"),
        selected_toppings: list = None,
        is_gift: bool = False,
        is_anonymous: bool = False,
        recipient_phone: str = "",
        recipient_name: str = "",
        recipient_address_text: str = "",
        recipient_latitude: Optional[float] = None,
        recipient_longitude: Optional[float] = None,
        recipient_specified_time: Optional[timezone.datetime] = None,
    ) -> OrderDraft:
        """
        Сохраняет или обновляет черновик заказа для пользователя.

        Обоснование: Устраняет проблему потери данных при заполнении формы заказа.
        Пользователь может вернуться к оформлению позже и продолжить с того же места.

        Args:
            user: Пользователь
            dish_id: ID блюда
            quantity: Количество
            delivery_type: Тип доставки
            delivery_address_text: Адрес доставки
            apartment: Квартира
            entrance: Подъезд
            floor: Этаж
            intercom: Домофон
            delivery_latitude: Широта
            delivery_longitude: Долгота
            delivery_price: Стоимость доставки
            selected_toppings: Выбранные добавки
            is_gift: Является ли подарком
            is_anonymous: Анонимный ли подарок
            recipient_phone: Телефон получателя
            recipient_name: Имя получателя
            recipient_address_text: Адрес получателя
            recipient_latitude: Широта получателя
            recipient_longitude: Долгота получателя
            recipient_specified_time: Желаемое время доставки

        Returns:
            OrderDraft: Созданный или обновленный черновик
        """
        if quantity < 1:
            raise ValueError("Quantity must be at least 1")
        if delivery_price < 0:
            raise ValueError("Delivery price cannot be negative")
        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            raise ValueError(f"Dish with id {dish_id} not found")

        # Проверяем, существует ли черновик для этого блюда у пользователя
        draft, created = OrderDraft.objects.get_or_create(
            user=user,
            dish=dish,
            defaults={
                "quantity": quantity,
                "delivery_type": delivery_type,
                "delivery_address_text": delivery_address_text,
                "apartment": apartment,
                "entrance": entrance,
                "floor": floor,
                "intercom": intercom,
                "delivery_latitude": delivery_latitude,
                "delivery_longitude": delivery_longitude,
                "delivery_price": delivery_price,
                "selected_toppings": selected_toppings or [],
                "is_gift": is_gift,
                "is_anonymous": is_anonymous,
                "recipient_phone": recipient_phone,
                "recipient_name": recipient_name,
                "recipient_address_text": recipient_address_text,
                "recipient_latitude": recipient_latitude,
                "recipient_longitude": recipient_longitude,
                "recipient_specified_time": recipient_specified_time,
            },
        )

        # Если черновик уже существует, обновляем его
        if not created:
            draft.quantity = quantity
            draft.delivery_type = delivery_type
            draft.delivery_address_text = delivery_address_text
            draft.apartment = apartment
            draft.entrance = entrance
            draft.floor = floor
            draft.intercom = intercom
            draft.delivery_latitude = delivery_latitude
            draft.delivery_longitude = delivery_longitude
            draft.delivery_price = delivery_price
            draft.selected_toppings = selected_toppings or []
            draft.is_gift = is_gift
            draft.is_anonymous = is_anonymous
            draft.recipient_phone = recipient_phone
            draft.recipient_name = recipient_name
            draft.recipient_address_text = recipient_address_text
            draft.recipient_latitude = recipient_latitude
            draft.recipient_longitude = recipient_longitude
            draft.recipient_specified_time = recipient_specified_time
            draft.save()

        return draft

    @staticmethod
    def get_user_drafts(user, dish_id: Optional[str] = None):
        """
        Получает черновики заказов пользователя.

        Args:
            user: Пользователь
            dish_id: Опциональный ID блюда для фильтрации

        Returns:
            QuerySet: Черновики заказов
        """
        queryset = OrderDraft.objects.filter(user=user).select_related("dish")
        if dish_id:
            queryset = queryset.filter(dish_id=dish_id)
        return queryset.order_by("-updated_at")

    @staticmethod
    def delete_draft(user, draft_id: str) -> bool:
        """
        Удаляет черновик заказа.

        Args:
            user: Пользователь
            draft_id: ID черновика

        Returns:
            bool: True если удален успешно
        """
        try:
            draft = OrderDraft.objects.get(id=draft_id, user=user)
            draft.delete()
            return True
        except OrderDraft.DoesNotExist:
            return False

    @staticmethod
    @transaction.atomic
    def reorder_from_existing(
        user,
        order_id: str,
        quantity: int = 1,
        delivery_type: str = "BUILDING",
        delivery_address_text: str = "",
        apartment: str = "",
        entrance: str = "",
        floor: str = "",
        intercom: str = "",
        delivery_latitude: Optional[float] = None,
        delivery_longitude: Optional[float] = None,
        delivery_price: Optional[Decimal] = None,
        selected_toppings: list = None,
        is_gift: bool = False,
        is_anonymous: bool = False,
        recipient_phone: str = "",
        recipient_name: str = "",
        recipient_address_text: str = "",
        recipient_latitude: Optional[float] = None,
        recipient_longitude: Optional[float] = None,
        recipient_specified_time: Optional[timezone.datetime] = None,
    ) -> Order:
        """
        Создает новый заказ на основе существующего (повторный заказ).

        Обоснование: Устраняет проблему необходимости повторно заполнять форму заказа
        для часто заказываемых блюд. Пользователь может быстро повторить заказ
        с теми же или измененными параметрами.

        Args:
            user: Пользователь
            order_id: ID существующего заказа
            quantity: Количество (можно изменить)
            delivery_type: Тип доставки (можно изменить)
            delivery_address_text: Адрес доставки (можно изменить)
            apartment: Квартира
            entrance: Подъезд
            floor: Этаж
            intercom: Домофон
            delivery_latitude: Широта
            delivery_longitude: Долгота
            delivery_price: Стоимость доставки
            selected_toppings: Выбранные добавки (можно изменить)
            is_gift: Является ли подарком
            is_anonymous: Анонимный ли подарок
            recipient_phone: Телефон получателя
            recipient_name: Имя получателя
            recipient_address_text: Адрес получателя
            recipient_latitude: Широта получателя
            recipient_longitude: Долгота получателя
            recipient_specified_time: Желаемое время доставки

        Returns:
            Order: Созданный заказ

        Raises:
            ValueError: Если заказ не найден или недоступен для повторения
        """
        try:
            original_order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            raise ValueError(f"Order with id {order_id} not found")

        # Проверяем, что заказ можно повторить
        if original_order.status not in ["COMPLETED", "CANCELLED"]:
            raise ValueError(
                "Only completed or cancelled orders can be reordered"
            )

        dish = original_order.dish

        # Используем цену доставки из параметров или из оригинального заказа
        if delivery_price is None:
            delivery_price = original_order.delivery_price

        # Рассчитываем общую стоимость
        dish_price = dish.price * quantity
        toppings_price = Decimal("0.00")
        if selected_toppings:
            for topping in selected_toppings:
                toppings_price += Decimal(str(topping.get("price", 0)))
        total_price = dish_price + toppings_price + delivery_price

        # Создаем новый заказ
        new_order = Order.objects.create(
            user=user,
            user_name=user.get_full_name() or user.email,
            phone=user.profile.phone if hasattr(user, "profile") else "",
            dish=dish,
            producer=dish.producer,
            quantity=quantity,
            total_price=total_price,
            delivery_type=delivery_type,
            delivery_price=delivery_price,
            delivery_address_text=delivery_address_text or original_order.delivery_address_text,
            apartment=apartment or original_order.apartment,
            entrance=entrance or original_order.entrance,
            floor=floor or original_order.floor,
            intercom=intercom or original_order.intercom,
            delivery_latitude=delivery_latitude or original_order.delivery_latitude,
            delivery_longitude=delivery_longitude or original_order.delivery_longitude,
            selected_toppings=selected_toppings or original_order.selected_toppings,
            is_gift=is_gift,
            is_anonymous=is_anonymous,
            recipient_phone=recipient_phone or original_order.recipient_phone,
            recipient_name=recipient_name or original_order.recipient_name,
            recipient_address_text=recipient_address_text or original_order.recipient_address_text,
            recipient_latitude=recipient_latitude or original_order.recipient_latitude,
            recipient_longitude=recipient_longitude or original_order.recipient_longitude,
            recipient_specified_time=recipient_specified_time or original_order.recipient_specified_time,
            status="WAITING_FOR_PAYMENT",
            estimated_cooking_time=dish.cooking_time_minutes,
        )

        # Копируем скидку если была
        if original_order.applied_promo_code:
            new_order.applied_promo_code = original_order.applied_promo_code
            new_order.discount_amount = original_order.discount_amount

        new_order.save()

        return new_order

    @staticmethod
    def calculate_order_price(
        dish: Dish,
        quantity: int,
        delivery_price: Decimal,
        selected_toppings: list = None,
        discount_percentage: int = 0,
    ) -> Dict[str, Decimal]:
        """
        Рассчитывает стоимость заказа.

        Args:
            dish: Блюдо
            quantity: Количество
            delivery_price: Стоимость доставки
            selected_toppings: Выбранные добавки
            discount_percentage: Процент скидки

        Returns:
            Dict: Словарь с компонентами стоимости
        """
        dish_price = dish.price * quantity

        toppings_price = Decimal("0.00")
        if selected_toppings:
            for topping in selected_toppings:
                toppings_price += Decimal(str(topping.get("price", 0)))

        subtotal = dish_price + toppings_price
        discount_amount = Decimal("0.00")
        if discount_percentage > 0:
            discount_amount = subtotal * Decimal(discount_percentage) / Decimal("100")

        total = subtotal - discount_amount + delivery_price

        return {
            "dish_price": dish_price,
            "toppings_price": toppings_price,
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "delivery_price": delivery_price,
            "total": total,
        }

    @staticmethod
    def calculate_multi_item_cooking_time(order_items: List[Order]) -> int:
        """
        Рассчитывает время изготовления для множественных позиций.

        Логика: max_time + (second_max_time / 2)

        Args:
            order_items: Список товаров в заказе

        Returns:
            int: Общее время изготовления в минутах
        """
        if not order_items:
            return 0

        # Собираем времена изготовления всех товаров
        cooking_times = []
        for item in order_items:
            if hasattr(item, 'dish') and item.dish:
                cooking_times.append(item.dish.cooking_time_minutes)
            elif hasattr(item, 'cooking_time_minutes'):
                cooking_times.append(item.cooking_time_minutes)

        if not cooking_times:
            return 0

        if len(cooking_times) == 1:
            return cooking_times[0]

        # Сортируем по убыванию
        cooking_times.sort(reverse=True)

        max_time = cooking_times[0]
        second_max_time = cooking_times[1]

        # Формула: max_time + (second_max_time / 2)
        total_time = max_time + (second_max_time // 2)
        if total_time == 0:
            total_time = 1  # Минимальное время приготовления
        return total_time

    @transaction.atomic
    def accept_order(self, order: Order, producer: Producer) -> Order:
        """
        Принимает заказ продавцом.

        Args:
            order: Заказ
            producer: Магазин (Producer)

        Returns:
            Order: Обновленный заказ

        Raises:
            ValidationError: Если заказ нельзя принять
        """
        if not order:
            raise ValidationError("Order is required")
        if not producer:
            raise ValidationError("Producer is required")

        # Проверяем статус заказа
        if order.status != "WAITING_FOR_ACCEPTANCE":
            raise ValidationError("Можно принять только заказы в статусе WAITING_FOR_ACCEPTANCE")

        # Проверяем срок принятия
        if order.acceptance_deadline and timezone.now() > order.acceptance_deadline:
            raise ValidationError("Время на принятие заказа истекло")

        # Проверяем, что заказ принадлежит этому магазину
        if order.producer != producer:
            raise ValidationError("Вы можете принимать только свои заказы")

        # Изменяем статус на ACCEPTED (или COOKING в зависимости от логики)
        order.status = "COOKING"
        order.accepted_at = timezone.now()

        # Обнуляем consecutive_rejections магазина
        producer.consecutive_rejections = 0
        producer.save(update_fields=["consecutive_rejections"])

        # Рассчитываем время изготовления для множественных позиций
        # В текущей структуре заказ содержит одно блюдо, но оставим логику для будущего
        order.estimated_cooking_time = self.calculate_multi_item_cooking_time([order])

        order.save(update_fields=["status", "accepted_at", "estimated_cooking_time"])

        logger.info(f"Order {order.id} accepted by producer {producer.id}")

        # Отправляем уведомление покупателю
        notification_service = NotificationService()
        notification_service.order_accepted(order)

        return order

    @transaction.atomic
    def reject_order(self, order: Order, producer: Producer, reason: str) -> Order:
        """
        Отклоняет заказ продавцом.

        Args:
            order: Заказ
            producer: Магазин (Producer)
            reason: Причина отклонения

        Returns:
            Order: Обновленный заказ

        Raises:
            ValidationError: Если заказ нельзя отклонить
        """
        if not order:
            raise ValidationError("Order is required")
        if not producer:
            raise ValidationError("Producer is required")

        # Проверяем статус заказа
        if order.status != "WAITING_FOR_ACCEPTANCE":
            raise ValidationError("Можно отклонить только заказы в статусе WAITING_FOR_ACCEPTANCE")

        # Проверяем, что заказ принадлежит этому магазину
        if order.producer != producer:
            raise ValidationError("Вы можете отклонять только свои заказы")

        # Изменяем статус на CANCELLED_BY_SELLER
        order.status = "CANCELLED"
        order.cancelled_by = "SELLER"
        order.cancelled_reason = reason
        order.cancelled_at = timezone.now()

        # Применяем штраф через penalty_service
        penalty_service = PenaltyService()
        penalty_service.apply_order_rejection_penalty(producer, order)

        order.save(update_fields=["status", "cancelled_by", "cancelled_reason", "cancelled_at"])

        logger.info(f"Order {order.id} rejected by producer {producer.id}. Reason: {reason}")

        # Возвращаем деньги покупателю
        if order.current_payment:
            payment_service = PaymentService()
            try:
                payment_service.refund_payment(order.current_payment, order.total_price)
                order.refund_amount = order.total_price
                order.save(update_fields=["refund_amount"])
            except Exception as e:
                logger.error(f"Failed to refund order {order.id}: {e}")
                raise  # Перебросить исключение для отката транзакции

        # Отправляем уведомление покупателю
        notification_service = NotificationService()
        notification_service.order_cancelled(order)

        return order

    @transaction.atomic
    def cancel_order_by_seller(self, order: Order, producer: Producer, reason: str) -> Order:
        """
        Отменяет уже принятый заказ продавцом.

        Args:
            order: Заказ
            producer: Магазин (Producer)
            reason: Причина отмены

        Returns:
            Order: Обновленный заказ

        Raises:
            ValidationError: Если заказ нельзя отменить
        """
        if not order:
            raise ValidationError("Order is required")
        if not producer:
            raise ValidationError("Producer is required")

        # Проверяем, что заказ уже принят
        if order.status not in ["COOKING", "READY_FOR_REVIEW", "READY_FOR_DELIVERY"]:
            raise ValidationError("Можно отменить только принятые заказы")

        # Проверяем, что заказ принадлежит этому магазину
        if order.producer != producer:
            raise ValidationError("Вы можете отменять только свои заказы")

        # Изменяем статус на CANCELLED_BY_SELLER
        order.status = "CANCELLED"
        order.cancelled_by = "SELLER"
        order.cancelled_reason = reason
        order.cancelled_at = timezone.now()

        # Применяем штраф 30% через penalty_service
        penalty_service = PenaltyService()
        penalty_service.apply_order_rejection_penalty(producer, order)

        # Устанавливаем флаг применения штрафа
        order.cancellation_penalty_applied = True

        order.save(update_fields=["status", "cancelled_by", "cancelled_reason", "cancelled_at", "cancellation_penalty_applied"])

        logger.info(f"Order {order.id} cancelled by seller {producer.id}. Reason: {reason}")

        # Возвращаем деньги покупателю
        if order.current_payment:
            payment_service = PaymentService()
            try:
                payment_service.refund_payment(order.current_payment, order.total_price)
                order.refund_amount = order.total_price
                order.save(update_fields=["refund_amount"])
            except Exception as e:
                logger.error(f"Failed to refund order {order.id}: {e}")

        # Отправляем уведомление покупателю
        notification_service = NotificationService()
        notification_service.order_cancelled(order)

        return order

    @transaction.atomic
    def cancel_order_by_buyer(self, order: Order, user, reason: str = "") -> Order:
        """
        Отменяет заказ покупателем.

        Args:
            order: Заказ
            user: Пользователь
            reason: Причина отмены

        Returns:
            Order: Обновленный заказ

        Raises:
            ValidationError: Если заказ нельзя отменить
        """
        if not order:
            raise ValidationError("Order is required")
        if not user:
            raise ValidationError("User is required")

        # Проверяем, что заказ принадлежит этому пользователю
        if order.user != user:
            raise ValidationError("Вы можете отменять только свои заказы")

        # Проверяем, что заказ можно отменить
        if order.status in ["COMPLETED", "DELIVERING", "ARRIVED"]:
            raise ValidationError("Этот заказ нельзя отменить")

        # Если нет finished_photo - отмена без потерь
        if not order.finished_photo:
            order.status = "CANCELLED"
            order.cancelled_by = "BUYER"
            order.cancelled_reason = reason
            order.cancelled_at = timezone.now()

            order.save(update_fields=["status", "cancelled_by", "cancelled_reason", "cancelled_at"])

            # Возвращаем деньги покупателю
            if order.current_payment:
                payment_service = PaymentService()
                try:
                    payment_service.refund_payment(order.current_payment, order.total_price)
                    order.refund_amount = order.total_price
                    order.save(update_fields=["refund_amount"])
                except Exception as e:
                    logger.error(f"Failed to refund order {order.id}: {e}")

            logger.info(f"Order {order.id} cancelled by buyer {user.id} without penalty")

        # Если есть finished_photo - компенсация магазину 10%
        else:
            order.status = "CANCELLED"
            order.cancelled_by = "BUYER"
            order.cancelled_reason = reason
            order.cancelled_at = timezone.now()

            # Компенсация магазину 10% (платформа платит)
            compensation_amount = order.total_price * Decimal("0.10")
            if order.producer:
                order.producer.balance += compensation_amount
                order.producer.save(update_fields=["balance"])

            # Увеличиваем unjustified_cancellations у покупателя
            try:
                profile = user.profile
                profile.unjustified_cancellations += 1
                profile.save(update_fields=["unjustified_cancellations"])
            except Profile.DoesNotExist:
                logger.warning(f"Profile not found for user {user.id}")

            # Возвращаем остаток денег покупателю
            refund_amount = order.total_price - compensation_amount
            if order.current_payment:
                payment_service = PaymentService()
                try:
                    payment_service.refund_payment(order.current_payment, refund_amount)
                    order.refund_amount = refund_amount
                    order.save(update_fields=["refund_amount"])
                except Exception as e:
                    logger.error(f"Failed to refund order {order.id}: {e}")

            logger.info(
                f"Order {order.id} cancelled by buyer {user.id} with compensation. "
                f"Compensation: {compensation_amount}"
            )

        # Отправляем уведомление продавцу
        notification_service = NotificationService()
        notification_service.order_cancelled(order)

        return order

    @transaction.atomic
    def upload_finished_photo(self, order: Order, photo_url: str) -> Order:
        """
        Загружает фото готового товара.

        Args:
            order: Заказ
            photo_url: URL фото готового товара

        Returns:
            Order: Обновленный заказ
        """
        if not order:
            raise ValidationError("Order is required")

        # Проверяем статус заказа
        if order.status != "COOKING":
            raise ValidationError("Фото можно загрузить только для заказа в статусе COOKING")

        # Сохраняем фото
        order.finished_photo = photo_url
        order.status = "READY_FOR_REVIEW"
        order.ready_at = timezone.now()
        order.save(update_fields=["finished_photo", "status", "ready_at"])

        logger.info(f"Finished photo uploaded for order {order.id}")

        # Отправляем уведомление покупателю
        notification_service = NotificationService()
        notification_service.order_ready_for_review(order)

        return order

    @transaction.atomic
    def add_tips(self, order: Order, amount: float) -> Order:
        """
        Добавляет чаевые к заказу.

        Args:
            order: Заказ
            amount: Сумма чаевых

        Returns:
            Order: Обновленный заказ
        """
        if not order:
            raise ValidationError("Order is required")

        if amount <= 0:
            raise ValidationError("Сумма чаевых должна быть больше 0")

        # Проверяем статус заказа
        if order.status not in ["DELIVERING", "ARRIVED", "COMPLETED"]:
            raise ValidationError("Чаевые можно добавить только для доставленного или завершенного заказа")

        # Добавляем чаевые
        order.tips_amount = Decimal(str(amount))
        order.save(update_fields=["tips_amount"])

        logger.info(f"Tips added for order {order.id}. Amount: {amount}")

        return order
