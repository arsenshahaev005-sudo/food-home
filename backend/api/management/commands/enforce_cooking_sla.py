from django.core.management.base import BaseCommand

from api.models import Order
from api.services.sla_service import SLAService


class Command(BaseCommand):
    help = "Enforce cooking SLA for orders"

    def handle(self, *args, **options):
        qs = Order.objects.filter(
            status="COOKING",
            accepted_at__isnull=False,
        )
        sla = SLAService()
        for order in qs.iterator():
            result = sla.check_cooking(order)
            if result.is_overdue:
                sla.enforce_cooking(order)

