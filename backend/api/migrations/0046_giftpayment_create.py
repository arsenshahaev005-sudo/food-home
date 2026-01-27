import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0045_giftorder_activation_meta_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="GiftPayment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True, default=uuid.uuid4, editable=False, serialize=False
                    ),
                ),
                ("provider", models.CharField(max_length=32)),
                ("provider_payment_intent_id", models.CharField(max_length=128, null=True, blank=True)),
                ("provider_charge_id", models.CharField(max_length=128, null=True, blank=True)),
                ("amount", models.DecimalField(max_digits=10, decimal_places=2)),
                ("currency", models.CharField(max_length=10, default="RUB")),
                (
                    "status",
                    models.CharField(
                        max_length=32,
                        choices=[
                            ("PENDING", "PENDING"),
                            ("AUTHORIZED", "AUTHORIZED"),
                            ("PAID", "PAID"),
                            ("FAILED", "FAILED"),
                            ("REFUNDED", "REFUNDED"),
                        ],
                        default="PENDING",
                    ),
                ),
                ("metadata", models.JSONField(default=dict, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "gift",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payment",
                        to="api.GiftOrder",
                    ),
                ),
            ],
        ),
    ]

