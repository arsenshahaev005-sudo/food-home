import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0043_outbox_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="giftorder",
            name="gift_product",
            field=models.ForeignKey(
                to="api.GiftProduct",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="gift_orders",
                null=True,
                blank=True,
            ),
        ),
    ]

