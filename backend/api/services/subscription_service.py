"""
Сервис для управления подписками на регулярные заказы.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from django.utils import timezone

from ..models import Dish, Order
from ..models_new import SubscriptionOrder

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Сервис для управления подписками."""

    @staticmethod
    def create_subscription(user, dish_id: str, quantity: int = 1,
                          frequency: str = "WEEKLY",
                          selected_toppings: Optional[List[Dict]] = None,
                          start_date: datetime = None,
                          end_date: datetime = None,
                          delivery_address_text: str = "",
                          notes: str = "") -> SubscriptionOrder:
        """
        Создать новую подписку.

        Возвращает созданный объект SubscriptionOrder.
        """
        if selected_toppings is None:
            selected_toppings = []

        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            raise ValueError(f"Dish with id {dish_id} not found")

        # Рассчитать дату следующей доставки
        if start_date is None:
            start_date = timezone.now().date()

        next_delivery_date = SubscriptionService._calculate_next_delivery_date(
            start_date, frequency
        )

        subscription = SubscriptionOrder.objects.create(
            user=user,
            dish=dish,
            quantity=quantity,
            selected_toppings=selected_toppings,
            frequency=frequency,
            status="ACTIVE",
            start_date=start_date,
            next_delivery_date=next_delivery_date,
            end_date=end_date,
            delivery_address_text=delivery_address_text,
            notes=notes,
        )

        logger.info(
            f"Created subscription for {dish.name} ({frequency}) for user {user.email}"
        )
        return subscription

    @staticmethod
    def update_subscription(subscription_id: str, user,
                          quantity: int = None,
                          delivery_address_text: str = None,
                          notes: str = None) -> SubscriptionOrder:
        """
        Обновить подписку.

        Возвращает обновленный объект SubscriptionOrder.
        """
        try:
            subscription = SubscriptionOrder.objects.get(id=subscription_id, user=user)
        except SubscriptionOrder.DoesNotExist:
            raise ValueError(f"Subscription with id {subscription_id} not found")

        if quantity is not None:
            subscription.quantity = quantity
        if delivery_address_text is not None:
            subscription.delivery_address_text = delivery_address_text
        if notes is not None:
            subscription.notes = notes

        subscription.save()

        logger.info(f"Updated subscription {subscription_id} for user {user.email}")
        return subscription

    @staticmethod
    def pause_subscription(subscription_id: str, user) -> SubscriptionOrder:
        """
        Приостановить подписку.

        Возвращает обновленный объект SubscriptionOrder.
        """
        try:
            subscription = SubscriptionOrder.objects.get(id=subscription_id, user=user)
        except SubscriptionOrder.DoesNotExist:
            raise ValueError(f"Subscription with id {subscription_id} not found")

        if subscription.status != "ACTIVE":
            raise ValueError("Only active subscriptions can be paused")

        subscription.status = "PAUSED"
        subscription.save()

        logger.info(f"Paused subscription {subscription_id} for user {user.email}")
        return subscription

    @staticmethod
    def resume_subscription(subscription_id: str, user) -> SubscriptionOrder:
        """
        Возобновить подписку.

        Возвращает обновленный объект SubscriptionOrder.
        """
        try:
            subscription = SubscriptionOrder.objects.get(id=subscription_id, user=user)
        except SubscriptionOrder.DoesNotExist:
            raise ValueError(f"Subscription with id {subscription_id} not found")

        if subscription.status != "PAUSED":
            raise ValueError("Only paused subscriptions can be resumed")

        subscription.status = "ACTIVE"
        subscription.save()

        logger.info(f"Resumed subscription {subscription_id} for user {user.email}")
        return subscription

    @staticmethod
    def cancel_subscription(subscription_id: str, user) -> SubscriptionOrder:
        """
        Отменить подписку.

        Возвращает обновленный объект SubscriptionOrder.
        """
        try:
            subscription = SubscriptionOrder.objects.get(id=subscription_id, user=user)
        except SubscriptionOrder.DoesNotExist:
            raise ValueError(f"Subscription with id {subscription_id} not found")

        subscription.status = "CANCELLED"
        subscription.end_date = timezone.now().date()
        subscription.save()

        logger.info(f"Cancelled subscription {subscription_id} for user {user.email}")
        return subscription

    @staticmethod
    def get_user_subscriptions(user, status: str = None) -> List[SubscriptionOrder]:
        """
        Получить подписки пользователя.

        Возвращает список подписок, отфильтрованных по статусу.
        """
        subscriptions = SubscriptionOrder.objects.filter(user=user)

        if status:
            subscriptions = subscriptions.filter(status=status)

        return subscriptions.select_related('dish', 'dish__producer').order_by('-created_at')

    @staticmethod
    def process_due_deliveries() -> int:
        """
        Обработать просроченные доставки для всех активных подписок.

        Возвращает количество созданных заказов.
        """
        today = timezone.now().date()

        # Найти подписки, у которых дата следующей доставки сегодня или раньше
        due_subscriptions = SubscriptionOrder.objects.filter(
            status="ACTIVE",
            next_delivery_date__lte=today
        )

        orders_created = 0
        for subscription in due_subscriptions:
            # Создать заказ на основе подписки
            try:
                Order.objects.create(
                    user=subscription.user,
                    dish=subscription.dish,
                    producer=subscription.dish.producer,
                    quantity=subscription.quantity,
                    total_price=Decimal(str(subscription.dish.price)) * subscription.quantity,
                    delivery_address_text=subscription.delivery_address_text,
                    status="WAITING_FOR_PAYMENT",
                    estimated_cooking_time=subscription.dish.cooking_time_minutes,
                    selected_toppings=subscription.selected_toppings,
                )
                orders_created += 1

                # Обновить дату следующей доставки
                subscription.next_delivery_date = SubscriptionService._calculate_next_delivery_date(
                    subscription.next_delivery_date,
                    subscription.frequency
                )
                subscription.save()

                logger.info(
                    f"Created order for subscription {subscription.id} for user {subscription.user.email}"
                )
            except Exception as e:
                logger.error(f"Error creating order for subscription {subscription.id}: {e}")

        return orders_created

    @staticmethod
    def _calculate_next_delivery_date(current_date: datetime, frequency: str) -> datetime:
        """
        Рассчитать дату следующей доставки.

        Возвращает дату следующей доставки на основе частоты.
        """
        if frequency == "DAILY":
            return current_date + timedelta(days=1)
        elif frequency == "WEEKLY":
            return current_date + timedelta(weeks=1)
        elif frequency == "BIWEEKLY":
            return current_date + timedelta(weeks=2)
        elif frequency == "MONTHLY":
            return current_date + timedelta(days=30)
        else:
            return current_date + timedelta(weeks=1)

    @staticmethod
    def get_subscription_statistics(user) -> Dict:
        """
        Получить статистику подписок пользователя.

        Возвращает словарь с информацией о подписках.
        """
        subscriptions = SubscriptionOrder.objects.filter(user=user)

        total_subscriptions = subscriptions.count()
        active_subscriptions = subscriptions.filter(status="ACTIVE").count()
        paused_subscriptions = subscriptions.filter(status="PAUSED").count()
        completed_subscriptions = subscriptions.filter(status="COMPLETED").count()
        cancelled_subscriptions = subscriptions.filter(status="CANCELLED").count()

        # Рассчитать общую сумму всех подписок
        total_monthly_cost = Decimal('0.00')
        for sub in subscriptions.filter(status="ACTIVE"):
            dish_price = Decimal(str(sub.dish.price)) * sub.quantity
            if sub.frequency == "DAILY":
                total_monthly_cost += dish_price * 30
            elif sub.frequency == "WEEKLY":
                total_monthly_cost += dish_price * 4
            elif sub.frequency == "BIWEEKLY":
                total_monthly_cost += dish_price * 2
            elif sub.frequency == "MONTHLY":
                total_monthly_cost += dish_price

        return {
            'total_subscriptions': total_subscriptions,
            'active_subscriptions': active_subscriptions,
            'paused_subscriptions': paused_subscriptions,
            'completed_subscriptions': completed_subscriptions,
            'cancelled_subscriptions': cancelled_subscriptions,
            'total_monthly_cost': float(total_monthly_cost),
        }
