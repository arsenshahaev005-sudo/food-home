"""
Management команда для автоматической обработки просроченных заказов.

Находит все заказы в статусе WAITING_FOR_ACCEPTANCE с истёкшим acceptance_deadline
и автоматически отклоняет их С применением штрафа.

Если продавец не успел принять заказ вовремя - это считается отказом,
применяются те же санкции что и при ручной отмене (штраф, автоматический отзыв, consecutive_rejections).

Запускать каждые 5 минут через cron:
*/5 * * * * python manage.py process_order_timeouts
"""

import logging

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import Order, Producer
from api.services.order_service import OrderService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Автоматически отклоняет просроченные заказы с применением штрафа"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Показать, что будет сделано, но не выполнять изменения",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Выводить подробную информацию",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        verbose = options.get("verbose", False)

        self.stdout.write(
            self.style.WARNING(
                f"Запуск обработки просроченных заказов (dry_run={dry_run})..."
            )
        )

        # Находим все заказы в статусе WAITING_FOR_ACCEPTANCE с истёкшим acceptance_deadline
        now = timezone.now()
        expired_orders = Order.objects.filter(
            status="WAITING_FOR_ACCEPTANCE",
            acceptance_deadline__lt=now,
        ).select_related("producer", "dish")

        count = expired_orders.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("Нет просроченных заказов"))
            return

        self.stdout.write(
            self.style.WARNING(f"Найдено {count} просроченных заказов")
        )

        order_service = OrderService()
        processed_count = 0
        error_count = 0

        for order in expired_orders:
            try:
                if verbose:
                    self.stdout.write(
                        f"Обработка заказа {order.id} от магазина {order.producer.name}"
                    )

                if dry_run:
                    self.stdout.write(
                        f"[DRY RUN] Отклонение заказа {order.id} "
                        f"(дедлайн: {order.acceptance_deadline})"
                    )
                    processed_count += 1
                    continue

                # Отклоняем заказ С штрафом (автоотмена по таймауту = отказ продавца)
                with transaction.atomic():
                    updated_order = order_service.reject_order(
                        order=order,
                        producer=order.producer,
                        reason="Истекло время принятия заказа",
                        apply_penalty=True  # Применяем штраф - не успел принять = отказ
                    )

                processed_count += 1

                if verbose:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Заказ {order.id} отклонен по таймауту. "
                            f"Штраф: {updated_order.penalty_amount} руб. "
                            f"consecutive_rejections: {order.producer.consecutive_rejections}"
                        )
                    )

            except Exception as e:
                error_count += 1
                logger.error(
                    f"Ошибка при обработке заказа {order.id}: {e}",
                    exc_info=True
                )
                self.stdout.write(
                    self.style.ERROR(
                        f"Ошибка при обработке заказа {order.id}: {e}"
                    )
                )

        # Проверяем забанированные магазины после обработки
        if not dry_run and processed_count > 0:
            self._check_banned_producers(verbose)

        # Выводим итоговую статистику
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(
            self.style.SUCCESS(
                f"Обработка завершена. "
                f"Обработано: {processed_count}, Ошибок: {error_count}"
            )
        )

    def _check_banned_producers(self, verbose=False):
        """
        Проверяет и выводит информацию о забанированных магазинах.

        Бан применяется автоматически в penalty_service.apply_order_rejection_penalty,
        здесь только выводим информацию для мониторинга.
        """
        banned_producers = Producer.objects.filter(
            is_banned=True,
            consecutive_rejections__gte=3,
        )

        if not banned_producers.exists():
            return

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(
            self.style.WARNING(
                f"⚠️ Забанированные магазины (всего: {banned_producers.count()}):"
            )
        )

        for producer in banned_producers:
            self.stdout.write(
                self.style.ERROR(
                    f"  🚫 {producer.name} (ID: {producer.id}): "
                    f"{producer.consecutive_rejections} отклонений подряд, "
                    f"причина: {producer.ban_reason}"
                )
            )

