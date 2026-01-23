from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0044_giftorder_gift_product_field"),
    ]

    operations = [
        migrations.AddField(
            model_name="giftorder",
            name="last_activation_attempt_at",
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="giftorder",
            name="last_activation_ip",
            field=models.GenericIPAddressField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="giftorder",
            name="last_activation_user_agent",
            field=models.TextField(blank=True),
        ),
    ]

