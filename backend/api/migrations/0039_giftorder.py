import uuid

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0038_payment_order_current_payment"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GiftOrder",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True, default=uuid.uuid4, editable=False, serialize=False
                    ),
                ),
                (
                    "recipient_contact_email",
                    models.CharField(max_length=255, blank=True),
                ),
                (
                    "recipient_contact_phone",
                    models.CharField(max_length=50, blank=True),
                ),
                (
                    "recipient_name",
                    models.CharField(max_length=255, blank=True),
                ),
                (
                    "state",
                    models.CharField(
                        max_length=64,
                        choices=[
                            ("CREATED", "Created"),
                            ("ACTIVATED", "Activated"),
                            ("CANCELLED_BY_PAYER", "Cancelled By Payer"),
                            ("CANCELLED_BY_SYSTEM_EXPIRED", "Cancelled By System Expired"),
                        ],
                        default="CREATED",
                    ),
                ),
                (
                    "gift_code",
                    models.CharField(max_length=64, unique=True),
                ),
                (
                    "activation_token",
                    models.CharField(max_length=128, unique=True),
                ),
                (
                    "amount",
                    models.DecimalField(max_digits=10, decimal_places=2, default=0),
                ),
                (
                    "currency",
                    models.CharField(max_length=10, default="RUB"),
                ),
                (
                    "valid_until",
                    models.DateTimeField(null=True, blank=True),
                ),
                (
                    "activated_at",
                    models.DateTimeField(null=True, blank=True),
                ),
                (
                    "cancelled_at",
                    models.DateTimeField(null=True, blank=True),
                ),
                (
                    "payment_external_id",
                    models.CharField(max_length=255, blank=True),
                ),
                (
                    "payment_status",
                    models.CharField(
                        max_length=30,
                        choices=[
                            ("INITIATED", "Initiated"),
                            ("PENDING", "Pending"),
                            ("SUCCEEDED", "Succeeded"),
                            ("FAILED", "Failed"),
                            ("REFUNDED", "Refunded"),
                            ("PARTIALLY_REFUNDED", "Partially Refunded"),
                            ("CANCELLED", "Cancelled"),
                        ],
                        default="SUCCEEDED",
                    ),
                ),
                (
                    "payment_metadata",
                    models.JSONField(default=dict, blank=True),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "order",
                    models.OneToOneField(
                        to="api.order",
                        on_delete=models.SET_NULL,
                        null=True,
                        blank=True,
                        related_name="gift_order",
                    ),
                ),
                (
                    "payer",
                    models.ForeignKey(
                        to=settings.AUTH_USER_MODEL,
                        on_delete=models.PROTECT,
                        null=True,
                        blank=True,
                        related_name="gift_orders",
                    ),
                ),
                (
                    "recipient_user",
                    models.ForeignKey(
                        to=settings.AUTH_USER_MODEL,
                        on_delete=models.SET_NULL,
                        null=True,
                        blank=True,
                        related_name="received_gift_orders",
                    ),
                ),
            ],
        ),
    ]

