from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Order
from api.services.order_status import OrderStatusService


class Command(BaseCommand):
    help = "Auto cancel orders that missed acceptance SLA"

    def handle(self, *args, **options):
        now = timezone.now()
        qs = Order.objects.filter(
            status="WAITING_FOR_ACCEPTANCE",
            acceptance_deadline__isnull=False,
            acceptance_deadline__lt=now,
        )
        service = OrderStatusService()
        for order in qs.iterator():
            service.auto_cancel_not_accepted(order.id)

