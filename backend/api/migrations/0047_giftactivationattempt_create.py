import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0046_giftpayment_create"),
    ]

    operations = [
        migrations.CreateModel(
            name="GiftActivationAttempt",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True, default=uuid.uuid4, editable=False, serialize=False
                    ),
                ),
                ("attempted_at", models.DateTimeField(auto_now_add=True)),
                ("ip", models.GenericIPAddressField()),
                ("user_agent", models.TextField()),
                (
                    "action",
                    models.CharField(
                        max_length=16,
                        choices=[
                            ("PREVIEW", "PREVIEW"),
                            ("ACTIVATE", "ACTIVATE"),
                        ],
                    ),
                ),
                (
                    "outcome",
                    models.CharField(
                        max_length=16,
                        choices=[
                            ("ATTEMPTED", "ATTEMPTED"),
                            ("SUCCESS", "SUCCESS"),
                        ],
                        default="ATTEMPTED",
                    ),
                ),
                (
                    "gift",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activation_attempts",
                        to="api.GiftOrder",
                    ),
                ),
            ],
        ),
    ]

