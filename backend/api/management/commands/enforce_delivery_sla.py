from django.core.management.base import BaseCommand

from api.models import Order
from api.services.sla_service import SLAService


class Command(BaseCommand):
    help = "Enforce delivery SLA for orders"

    def handle(self, *args, **options):
        qs = Order.objects.filter(
            status__in=["READY_FOR_DELIVERY", "DELIVERING"],
        )
        sla = SLAService()
        for order in qs.iterator():
            result = sla.check_delivery(order)
            if result.is_overdue:
                sla.enforce_delivery(order)

