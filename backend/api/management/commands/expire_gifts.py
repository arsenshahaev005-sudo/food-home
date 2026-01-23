from django.core.management.base import BaseCommand

from api.services.gift_service import expire_gifts_batch


class Command(BaseCommand):
    help = "Expire gift orders with passed valid_until"

    def handle(self, *args, **options):
        total = 0
        while True:
            processed = expire_gifts_batch(limit=100)
            if processed == 0:
                break
            total += processed
        self.stdout.write(self.style.SUCCESS(f"Expired {total} gifts"))

