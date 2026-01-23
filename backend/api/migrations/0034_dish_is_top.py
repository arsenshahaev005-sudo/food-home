from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0033_order_apartment_order_delivery_comment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='dish',
            name='is_top',
            field=models.BooleanField(default=False),
        ),
    ]

