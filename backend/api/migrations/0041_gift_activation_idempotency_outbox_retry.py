import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0039_giftorder"),
        ("api", "0040_dish_producer_rating_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="OutboxEvent",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True, default=uuid.uuid4, editable=False, serialize=False
                    ),
                ),
                ("aggregate_type", models.CharField(max_length=64)),
                ("aggregate_id", models.UUIDField()),
                ("event_type", models.CharField(max_length=64)),
                ("payload", models.JSONField()),
                ("status", models.CharField(max_length=16, default="PENDING")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("processed_at", models.DateTimeField(null=True, blank=True)),
                ("attempt_count", models.PositiveIntegerField(default=0)),
                ("next_attempt_at", models.DateTimeField(null=True, blank=True)),
                ("error_message", models.TextField(blank=True)),
                ("dead_letter", models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name="GiftActivationIdempotency",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True, default=uuid.uuid4, editable=False, serialize=False
                    ),
                ),
                (
                    "activation_token",
                    models.CharField(max_length=128, unique=True),
                ),
                (
                    "success",
                    models.BooleanField(default=False),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "gift",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activation_idempotencies",
                        to="api.GiftOrder",
                    ),
                ),
                (
                    "order",
                    models.OneToOneField(
                        null=True,
                        blank=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="gift_activation_idempotency",
                        to="api.Order",
                    ),
                ),
            ],
        ),
    ]
