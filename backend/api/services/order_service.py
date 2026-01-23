"""
Сервис для бизнес-логики заказов.
Включает функции для автосохранения черновиков и повторного заказа.
"""

from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from typing import Dict, Optional

from ..models import Order, OrderDraft, Dish


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
