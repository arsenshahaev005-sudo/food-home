from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import OutboxEvent


class Command(BaseCommand):
    help = "Cleanup processed and dead outbox events"

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=30)
        total_deleted = 0
        while True:
            ids = list(
                OutboxEvent.objects.filter(
                    status__in=["PROCESSED", "DEAD"],
                    processed_at__lt=cutoff,
                )
                .values_list("id", flat=True)[:1000]
            )
            if not ids:
                break
            deleted, _ = OutboxEvent.objects.filter(id__in=ids).delete()
            total_deleted += deleted
        self.stdout.write(self.style.SUCCESS(f"Deleted {total_deleted} OutboxEvent records"))

