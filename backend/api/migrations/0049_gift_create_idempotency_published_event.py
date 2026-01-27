import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0048_giftpayment_refund_operation"),
    ]

    operations = [
        migrations.CreateModel(
            name="GiftCreateIdempotency",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                (
                    "idempotency_key",
                    models.CharField(max_length=128, unique=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "gift",
                    models.OneToOneField(
                        null=True,
                        blank=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="create_idempotency",
                        to="api.GiftOrder",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="PublishedEvent",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("topic", models.CharField(max_length=64)),
                ("published_at", models.DateTimeField(auto_now_add=True)),
                (
                    "outbox_event",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="publication",
                        to="api.OutboxEvent",
                    ),
                ),
            ],
        ),
    ]

