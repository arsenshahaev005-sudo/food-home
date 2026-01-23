from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0041_gift_activation_idempotency_outbox_retry"),
    ]

    operations = [
        migrations.CreateModel(
            name="GiftProduct",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True, default=uuid.uuid4, editable=False, serialize=False
                    ),
                ),
                (
                    "type",
                    models.CharField(
                        max_length=32,
                        choices=[
                            ("CERTIFICATE", "CERTIFICATE"),
                            ("FIXED_MEAL", "FIXED_MEAL"),
                            ("BUNDLE", "BUNDLE"),
                        ],
                    ),
                ),
                ("price", models.DecimalField(max_digits=10, decimal_places=2)),
                ("rules", models.JSONField(default=dict, blank=True)),
                ("rules_version", models.PositiveIntegerField(default=1)),
                ("active", models.BooleanField(default=True)),
                (
                    "base_dish",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="gift_products",
                        to="api.Dish",
                        null=True,
                        blank=True,
                    ),
                ),
            ],
        ),
    ]

