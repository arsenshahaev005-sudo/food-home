"""
Management команда для обработки опоздавших доставок.
Применять штрафы. Запускать каждые 10 минут.
"""
import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Order
from api.services.sla_service import SLAService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Обрабатывает опоздавшие доставки и применяет штрафы'

    def handle(self, *args, **options):
        """Основная логика команды."""
        self.stdout.write('Начинаем обработку опоздавших доставок...')

        sla_service = SLAService()

        # Находим заказы в статусе DELIVERING или ARRIVED
        # с установленным expected_arrival_time
        orders_to_check = Order.objects.filter(
            status__in=["DELIVERING", "ARRIVED"]
        ).exclude(
            delivery_expected_at__isnull=True
        )

        total_processed = 0
        total_late = 0

        for order in orders_to_check:
            try:
                # Если уже установлено фактическое время, проверяем опоздание
                if order.delivery_actual_arrival_at:
                    # Проверяем, был ли применен штраф
                    if not order.delivery_penalty_applied:
                        # Проверяем опоздание
                        if order.delivery_expected_at:
                            late_delta = order.delivery_actual_arrival_at - order.delivery_expected_at
                            late_minutes = int(late_delta.total_seconds() / 60) if late_delta.total_seconds() > 0 else 0

                            if late_minutes > 30:
                                # Применяем штраф
                                sla_service._apply_late_delivery_penalty(order, late_minutes)
                                total_late += 1
                                self.stdout.write(
                                    f'Заказ {order.id} опоздал на {late_minutes} минут. Штраф применен.'
                                )
                            else:
                                total_processed += 1
                                self.stdout.write(
                                    f'Заказ {order.id} доставлен вовремя (опоздание: {late_minutes} минут).'
                                )
                        else:
                            total_processed += 1
                            self.stdout.write(
                                f'Заказ {order.id} уже обработан.'
                            )
                else:
                    # Если фактическое время не установлено, используем текущее время
                    if order.delivery_expected_at and timezone.now() > order.delivery_expected_at:
                        late_delta = timezone.now() - order.delivery_expected_at
                        late_minutes = int(late_delta.total_seconds() / 60) if late_delta.total_seconds() > 0 else 0

                        if late_minutes > 30:
                            # Устанавливаем фактическое время и применяем штраф
                            order.delivery_actual_arrival_at = timezone.now()
                            order.delivery_late_minutes = late_minutes
                            order.save(update_fields=["delivery_actual_arrival_at", "delivery_late_minutes"])

                            sla_service._apply_late_delivery_penalty(order, late_minutes)
                            total_late += 1
                            self.stdout.write(
                                f'Заказ {order.id} опоздал на {late_minutes} минут. Штраф применен.'
                            )
                        else:
                            total_processed += 1
                            self.stdout.write(
                                f'Заказ {order.id} еще доставляется (опоздание: {late_minutes} минут).'
                            )
                    else:
                        total_processed += 1
                        self.stdout.write(
                            f'Заказ {order.id} еще доставляется.'
                        )

                total_processed += 1

            except Exception as e:
                logger.error(f"Ошибка при обработке заказа {order.id}: {e}")
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Обработано {total_processed} заказов'
            )
        )

        if total_late > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'Применено штрафов: {total_late}'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                'Обработка опоздавших доставок завершена'
            )
        )
