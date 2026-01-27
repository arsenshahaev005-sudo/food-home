from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import models, transaction
from django.utils import timezone

from api.models import OutboxEvent, PublishedEvent

MAX_ATTEMPTS = 10


def _calculate_next_attempt(attempt_count: int, base_seconds: int = 30, max_minutes: int = 60):
    backoff_seconds = base_seconds * (2 ** (attempt_count - 1))
    max_seconds = max_minutes * 60
    backoff_seconds = min(backoff_seconds, max_seconds)
    return timezone.now() + timedelta(seconds=backoff_seconds)


def _publish_event(event: OutboxEvent):
    payload = event.payload or {}
    if isinstance(payload, dict) and payload.get("force_error"):
        raise RuntimeError("Publish error")
    if event.aggregate_type == "gift":
        topic = "gift-events"
    elif event.aggregate_type == "order":
        topic = "order-events"
    else:
        topic = "events"
    PublishedEvent.objects.get_or_create(
        outbox_event=event,
        defaults={"topic": topic},
    )


class Command(BaseCommand):
    help = "Process OutboxEvent records with retry, backoff and dead-letter handling"

    def handle(self, *args, **options):
        total_processed = 0
        while True:
            processed_in_batch = self._process_batch(limit=100)
            if processed_in_batch == 0:
                break
            total_processed += processed_in_batch
        self.stdout.write(self.style.SUCCESS(f"Processed {total_processed} outbox events"))

    def _process_batch(self, limit: int) -> int:
        now = timezone.now()
        with transaction.atomic():
            events = (
                OutboxEvent.objects.select_for_update(skip_locked=True)
                .filter(
                    dead_letter=False,
                    status="PENDING",
                )
                .filter(
                    models.Q(next_attempt_at__isnull=True) | models.Q(next_attempt_at__lte=now)
                )
                .order_by("created_at")[:limit]
            )
            events = list(events)
            if not events:
                return 0
            processed = 0
            for event in events:
                try:
                    _publish_event(event)
                except Exception as exc:
                    event.attempt_count += 1
                    event.error_message = str(exc)[:1000]
                    if event.attempt_count >= MAX_ATTEMPTS:
                        event.dead_letter = True
                        event.status = "DEAD"
                    else:
                        event.next_attempt_at = _calculate_next_attempt(event.attempt_count)
                    event.save(
                        update_fields=[
                            "attempt_count",
                            "error_message",
                            "dead_letter",
                            "status",
                            "next_attempt_at",
                        ]
                    )
                    continue
                event.status = "PROCESSED"
                event.processed_at = now
                event.save(update_fields=["status", "processed_at"])
                processed += 1
            return processed
