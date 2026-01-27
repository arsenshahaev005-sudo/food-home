"""
Сервис для бизнес-логики корзины.
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from django.db import transaction
from django.db.models import F, Max, Sum

from ..models import Cart, CartItem, Dish
from ..models_new import SavedCartItem

logger = logging.getLogger(__name__)


class CartService:
    """Сервис для управления корзиной."""

    @staticmethod
    def get_cart_total_cooking_time(cart: Cart) -> int:
        """
        Рассчитать общее время приготовления для всех товаров в корзине.
        Возвращает максимальное время приготовления среди всех товаров.
        """
        if not hasattr(cart, 'items') or not cart.items.exists():
            return 0

        max_time = cart.items.aggregate(
            max_cooking_time=Max("dish__cooking_time_minutes")
        )["max_cooking_time"]

        return max_time if max_time else 0

    @staticmethod
    def get_cart_summary(cart: Cart) -> Dict:
        """
        Получить сводную информацию о корзине.
        """
        if not cart:
            raise ValueError("Cart is required")
        items = cart.items.select_related('dish', 'dish__producer')

        total_items = items.count()
        total_price = items.aggregate(
            total=Sum(F('quantity') * F('price_at_the_moment'))
        )["total"] or Decimal('0.00')

        total_cooking_time = CartService.get_cart_total_cooking_time(cart)

        items_data = []
        for item in items:
            item_total = item.quantity * item.price_at_the_moment
            items_data.append({
                'id': str(item.id),
                'dish_id': str(item.dish.id),
                'dish_name': item.dish.name,
                'dish_photo': item.dish.photo,
                'quantity': item.quantity,
                'price': float(item.price_at_the_moment),
                'total': float(item_total),
                'selected_toppings': item.selected_toppings,
                'cooking_time_minutes': item.dish.cooking_time_minutes,
            })

        return {
            'total_items': total_items,
            'total_price': float(total_price),
            'total_cooking_time': total_cooking_time,
            'items': items_data,
        }

    @staticmethod
    @transaction.atomic
    def add_to_cart(user, dish_id: str, quantity: int = 1,
                   selected_toppings: Optional[List[Dict]] = None) -> Tuple[CartItem, bool]:
        """
        Добавить товар в корзину.

        Возвращает кортеж (item, created), где:
        - item: объект CartItem
        - created: True если товар был создан, False если обновлен
        """
        if selected_toppings is None:
            selected_toppings = []

        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            raise ValueError(f"Dish with id {dish_id} not found")

        cart, _ = Cart.objects.get_or_create(user=user)

        # Проверить максимальное количество
        if dish.max_quantity_per_order:
            existing = cart.items.filter(
                dish=dish, selected_toppings=selected_toppings
            ).first()
            existing_qty = existing.quantity if existing else 0
            max_qty = int(dish.max_quantity_per_order)
            if existing_qty + quantity > max_qty:
                raise ValueError(
                    f"Maximum {max_qty} items per order for this dish"
                )

        item, created = cart.items.get_or_create(
            dish=dish,
            selected_toppings=selected_toppings,
            defaults={
                "quantity": quantity,
                "price_at_the_moment": dish.price,
            },
        )

        if not created:
            item.quantity = item.quantity + quantity
            item.price_at_the_moment = dish.price
            item.save()

        # Увеличить счетчик
        if created:
            dish.in_cart_count = F('in_cart_count') + 1
            dish.save(update_fields=["in_cart_count"])

        logger.info(f"Added {quantity}x {dish.name} to cart for user {user.email}")
        return item, created

    @staticmethod
    @transaction.atomic
    def remove_from_cart(user, dish_id: str,
                      selected_toppings: Optional[List[Dict]] = None) -> bool:
        """
        Удалить товар из корзины.

        Возвращает True если товар был удален, False если не найден.
        """
        if selected_toppings is None:
            selected_toppings = []

        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            logger.warning(f"Dish with id {dish_id} not found when removing from cart")
            return False

        cart, _ = Cart.objects.get_or_create(user=user)

        try:
            item = cart.items.get(dish=dish, selected_toppings=selected_toppings)
            item.delete()
            dish.in_cart_count = max(0, dish.in_cart_count - 1)
            dish.save(update_fields=["in_cart_count"])
            logger.info(f"Removed {dish.name} from cart for user {user.email}")
            return True
        except CartItem.DoesNotExist:
            return False

    @staticmethod
    @transaction.atomic
    def update_item_quantity(user, dish_id: str, quantity: int,
                           selected_toppings: Optional[List[Dict]] = None) -> CartItem:
        """
        Обновить количество товара в корзине.

        Возвращает обновленный объект CartItem.
        """
        if selected_toppings is None:
            selected_toppings = []

        if quantity < 1:
            raise ValueError("Quantity must be at least 1")

        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            raise ValueError(f"Dish with id {dish_id} not found")

        cart, _ = Cart.objects.get_or_create(user=user)

        # Проверить максимальное количество
        if dish.max_quantity_per_order and quantity > int(dish.max_quantity_per_order):
            raise ValueError(
                f"Maximum {dish.max_quantity_per_order} items per order for this dish"
            )

        item = cart.items.get(dish=dish, selected_toppings=selected_toppings)
        item.quantity = quantity
        item.price_at_the_moment = dish.price
        item.save()

        logger.info(
            f"Updated {dish.name} quantity to {quantity} in cart for user {user.email}"
        )
        return item

    @staticmethod
    @transaction.atomic
    def clear_cart(user) -> int:
        """
        Очистить корзину пользователя.

        Возвращает количество удаленных товаров.
        """
        cart, _ = Cart.objects.get_or_create(user=user)

        # Уменьшить счетчики перед очисткой
        items = cart.items.all()
        count = items.count()
        for item in items:
            dish = item.dish
            dish.in_cart_count = max(0, dish.in_cart_count - 1)
            dish.save(update_fields=["in_cart_count"])

        items.delete()
        logger.info(f"Cleared cart for user {user.email}, removed {count} items")
        return count

    @staticmethod
    @transaction.atomic
    def save_for_later(user, dish_id: str, quantity: int = 1,
                      selected_toppings: Optional[List[Dict]] = None,
                      notes: str = "") -> SavedCartItem:
        """
        Сохранить товар для покупки позже.

        Возвращает созданный объект SavedCartItem.
        """
        if selected_toppings is None:
            selected_toppings = []

        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            raise ValueError(f"Dish with id {dish_id} not found")

        item, created = SavedCartItem.objects.get_or_create(
            user=user,
            dish=dish,
            selected_toppings=selected_toppings,
            defaults={
                "quantity": quantity,
                "notes": notes,
            },
        )

        if not created:
            item.quantity = quantity
            item.notes = notes
            item.save()

        logger.info(
            f"Saved {dish.name} for later for user {user.email}"
        )
        return item

    @staticmethod
    def get_saved_items(user):
        """
        Получить список сохраненных товаров пользователя.
        """
        return SavedCartItem.objects.filter(
            user=user
        ).select_related('dish').order_by('-created_at')

    @staticmethod
    @transaction.atomic
    def remove_saved_item(user, item_id: str) -> bool:
        """
        Удалить сохраненный товар.

        Возвращает True если товар был удален, False если не найден.
        """
        try:
            item = SavedCartItem.objects.get(id=item_id, user=user)
            item.delete()
            logger.info(f"Removed saved item {item_id} for user {user.email}")
            return True
        except SavedCartItem.DoesNotExist:
            return False

    @staticmethod
    @transaction.atomic
    def move_saved_to_cart(user, item_id: str) -> CartItem:
        """
        Переместить сохраненный товар в корзину.

        Возвращает созданный объект CartItem.
        """
        try:
            saved_item = SavedCartItem.objects.get(id=item_id, user=user)
        except SavedCartItem.DoesNotExist:
            raise ValueError(f"Saved item with id {item_id} not found")

        # Добавить в корзину
        cart_item, _ = CartService.add_to_cart(
            user=user,
            dish_id=str(saved_item.dish.id),
            quantity=saved_item.quantity,
            selected_toppings=saved_item.selected_toppings,
        )

        # Удалить из сохраненных
        saved_item.delete()

        logger.info(
            f"Moved saved item {item_id} to cart for user {user.email}"
        )
        return cart_item
