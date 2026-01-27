"""
Management команда для обновления статистики повторных покупок.
Запускать каждую ночь через cron.
"""
import logging

from django.core.management.base import BaseCommand
from django.db.models import Count

from api.models import Dish, Order
from api.services.repeat_purchase_service import RepeatPurchaseService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Обновляет статистику повторных покупок'

    def handle(self, *args, **options):
        """Основная логика команды."""
        self.stdout.write('Начинаем обновление статистики повторных покупок...')

        repeat_purchase_service = RepeatPurchaseService()

        # Обновляем статистику для всех завершенных заказов
        completed_orders = Order.objects.filter(status="COMPLETED")
        total_updated = 0

        for order in completed_orders:
            try:
                repeat_purchase_service.track_order_completion(order)
                total_updated += 1
            except Exception as e:
                logger.error(f"Ошибка при обновлении заказа {order.id}: {e}")
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Обновлено {total_updated} заказов'
            )
        )

        # Обновляем статистику повторных покупок для блюд
        dishes = Dish.objects.all()
        dishes_updated = 0

        for dish in dishes:
            try:
                # Считаем количество повторных покупок для блюда
                repeat_count = Order.objects.filter(
                    dish=dish,
                    status="COMPLETED"
                ).annotate(
                    customer_order_count=Count("user")
                ).filter(customer_order_count__gt=1).count()

                dish.repeat_purchase_count = repeat_count
                dish.save(update_fields=["repeat_purchase_count"])
                dishes_updated += 1
            except Exception as e:
                logger.error(f"Ошибка при обновлении блюда {dish.id}: {e}")
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Обновлено {dishes_updated} блюд'
            )
        )

        self.stdout.write(
            self.style.SUCCESS(
                'Обновление статистики повторных покупок завершено'
            )
        )
