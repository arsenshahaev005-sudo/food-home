import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0038_payment_order_current_payment"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="dispute",
            name="opened_by",
            field=models.CharField(default="BUYER", max_length=20),
        ),
        migrations.AddField(
            model_name="dispute",
            name="opened_by_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="opened_disputes",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="dispute",
            name="resolved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

