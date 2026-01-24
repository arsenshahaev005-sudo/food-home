"""
Сервис для отслеживания повторных покупок и расчета бонусов.
"""

import logging
from decimal import Decimal
from typing import List

from django.db import transaction
from django.db.models import Count, Q, F

from api.models import Order, Profile, Producer, Dish

logger = logging.getLogger(__name__)


class RepeatPurchaseService:
    """Сервис для управления повторными покупками."""

    @transaction.atomic
    def track_order_completion(self, order: Order):
        """
        После завершения заказа проверить, повторная ли это покупка у магазина.
        Обновить total_orders и repeated_orders в Profile.
        Рассчитать repeat_purchase_rate.
        Обновить repeat_purchase_count для каждого Dish в заказе.
        """
        if order.status != "COMPLETED":
            logger.warning(f"Order {order.id} is not completed, skipping repeat purchase tracking")
            return

        user = order.user
        producer = order.producer

        if not user or not producer:
            return

        # Получаем или создаем профиль пользователя
        profile, _ = Profile.objects.get_or_create(user=user)

        # Проверяем, делал ли пользователь ранее заказы у этого магазина
        previous_orders_count = Order.objects.filter(
            user=user,
            producer=producer,
            status="COMPLETED"
        ).exclude(id=order.id).count()

        # Если это не первый заказ у этого магазина, увеличиваем repeated_orders
        is_repeat = previous_orders_count > 0

        # Обновляем статистику пользователя
        profile.total_orders = profile.total_orders + 1
        if is_repeat:
            profile.repeated_orders = profile.repeated_orders + 1

        # Рассчитываем repeat_purchase_rate
        if profile.total_orders > 0:
            profile.repeat_purchase_rate = Decimal(profile.repeated_orders) / Decimal(profile.total_orders) * Decimal("100")
        else:
            profile.repeat_purchase_rate = Decimal("0")

        profile.save(update_fields=["total_orders", "repeated_orders", "repeat_purchase_rate"])

        # Обновляем repeat_purchase_count для блюда
        if is_repeat:
            dish = order.dish
            if dish:
                dish.repeat_purchase_count = dish.repeat_purchase_count + 1
                dish.save(update_fields=["repeat_purchase_count"])

        logger.info(
            f"Order {order.id} completed. "
            f"Is repeat: {is_repeat}, "
            f"User total orders: {profile.total_orders}, "
            f"User repeated orders: {profile.repeated_orders}"
        )

    def calculate_commission_bonus(self, producer: Producer) -> Decimal:
        """
        Рассчитать количество уникальных повторных покупателей.
        Вернуть бонус: минус 1% за каждого повторного покупателя.
        Максимальный бонус: -10% (чтобы комиссия не стала отрицательной).
        """
        # Получаем список уникальных покупателей
        customers = Order.objects.filter(
            producer=producer,
            status="COMPLETED"
        ).values_list("user_id", flat=True).distinct()

        # Считаем количество повторных покупателей (те, кто сделал >1 заказа)
        repeat_customers_count = 0
        for customer_id in customers:
            order_count = Order.objects.filter(
                producer=producer,
                user_id=customer_id,
                status="COMPLETED"
            ).count()
            if order_count > 1:
                repeat_customers_count += 1

        # Рассчитываем бонус: минус 1% за каждого повторного покупателя
        bonus_percentage = min(repeat_customers_count, 10) * Decimal("0.01")

        logger.info(
            f"Producer {producer.id} has {repeat_customers_count} repeat customers. "
            f"Commission bonus: -{bonus_percentage * 100}%"
        )

        return bonus_percentage

    def get_repeat_customers(self, producer: Producer) -> List[dict]:
        """
        Получить список покупателей, которые сделали >1 заказа.
        """
        # Получаем всех покупателей с количеством заказов
        customers_data = Order.objects.filter(
            producer=producer,
            status="COMPLETED"
        ).values(
            "user_id",
            "user__first_name",
            "user__last_name",
            "user__email"
        ).annotate(
            order_count=Count("id"),
            total_spent=F("total_price") * F("quantity")
        ).filter(
            order_count__gt=1
        ).order_by("-order_count")

        # Форматируем результат
        result = []
        for customer in customers_data:
            result.append({
                "user_id": str(customer["user_id"]),
                "name": f"{customer['user__first_name'] or ''} {customer['user__last_name'] or ''}".strip(),
                "email": customer["user__email"] or "",
                "order_count": customer["order_count"],
                "total_spent": float(customer["total_spent"]),
            })

        return result

    def get_producer_repeat_stats(self, producer: Producer) -> dict:
        """
        Получить статистику повторных покупок для магазина.
        """
        total_customers = Order.objects.filter(
            producer=producer,
            status="COMPLETED"
        ).values_list("user_id", flat=True).distinct().count()

        repeat_customers = len(self.get_repeat_customers(producer))

        total_orders = Order.objects.filter(
            producer=producer,
            status="COMPLETED"
        ).count()

        repeat_orders = Order.objects.filter(
            producer=producer,
            status="COMPLETED"
        ).annotate(
            customer_order_count=Count("user_id")
        ).filter(customer_order_count__gt=1).count()

        commission_bonus = self.calculate_commission_bonus(producer)

        return {
            "total_customers": total_customers,
            "repeat_customers": repeat_customers,
            "total_orders": total_orders,
            "repeat_orders": repeat_orders,
            "repeat_rate": (repeat_customers / total_customers * 100) if total_customers > 0 else 0,
            "commission_bonus_percentage": float(commission_bonus * 100),
        }
