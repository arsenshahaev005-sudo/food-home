from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0047_giftactivationattempt_create"),
    ]

    operations = [
        migrations.AddField(
            model_name="giftpayment",
            name="amount_captured",
            field=models.DecimalField(max_digits=10, decimal_places=2, default=0),
        ),
        migrations.AddField(
            model_name="giftpayment",
            name="amount_refunded",
            field=models.DecimalField(max_digits=10, decimal_places=2, default=0),
        ),
        migrations.AddField(
            model_name="giftpayment",
            name="version",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="RefundOperation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True, default=uuid.uuid4, editable=False, serialize=False
                    ),
                ),
                ("business_key", models.CharField(max_length=128, unique=True)),
                (
                    "source",
                    models.CharField(
                        max_length=16,
                        choices=[
                            ("SLA", "SLA"),
                            ("DISPUTE", "DISPUTE"),
                            ("CHARGEBACK", "CHARGEBACK"),
                            ("MANUAL", "MANUAL"),
                        ],
                    ),
                ),
                ("requested_amount", models.DecimalField(max_digits=10, decimal_places=2)),
                ("approved_amount", models.DecimalField(max_digits=10, decimal_places=2)),
                (
                    "status",
                    models.CharField(
                        max_length=32,
                        choices=[
                            ("REQUESTED", "REQUESTED"),
                            ("PSP_PENDING", "PSP_PENDING"),
                            ("PSP_COMPLETED", "PSP_COMPLETED"),
                            ("PSP_FAILED", "PSP_FAILED"),
                            ("CANCELLED", "CANCELLED"),
                        ],
                        default="REQUESTED",
                    ),
                ),
                ("psp_reference", models.CharField(max_length=128, null=True, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("archived_at", models.DateTimeField(null=True, blank=True)),
                (
                    "payment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="refund_operations",
                        to="api.GiftPayment",
                    ),
                ),
            ],
        ),
    ]

