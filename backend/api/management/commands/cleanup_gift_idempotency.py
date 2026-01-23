from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import GiftActivationIdempotency


class Command(BaseCommand):
    help = "Cleanup old successful gift activation idempotency records"

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=180)
        total_deleted = 0
        while True:
            ids = list(
                GiftActivationIdempotency.objects.filter(
                    success=True,
                    order__isnull=False,
                    updated_at__lt=cutoff,
                )
                .values_list("id", flat=True)[:1000]
            )
            if not ids:
                break
            deleted, _ = GiftActivationIdempotency.objects.filter(id__in=ids).delete()
            total_deleted += deleted
        self.stdout.write(self.style.SUCCESS(f"Deleted {total_deleted} GiftActivationIdempotency records"))

