import time

from django.core.management import BaseCommand, call_command
from django.utils import timezone


class Command(BaseCommand):
    help = "Run background jobs: process outbox and periodic cleanups"

    def add_arguments(self, parser):
        parser.add_argument(
            "--outbox-interval",
            type=int,
            default=10,
            help="Interval in seconds between process_outbox_events runs",
        )
        parser.add_argument(
            "--cleanup-interval",
            type=int,
            default=3600,
            help="Interval in seconds between cleanup runs",
        )

    def handle(self, *args, **options):
        outbox_interval = options["outbox_interval"]
        cleanup_interval = options["cleanup_interval"]
        last_cleanup_at = timezone.now()
        while True:
            call_command("process_outbox_events")
            now = timezone.now()
            if (now - last_cleanup_at).total_seconds() >= cleanup_interval:
                call_command("cleanup_outbox_events")
                call_command("cleanup_gift_idempotency")
                last_cleanup_at = now
            time.sleep(outbox_interval)

