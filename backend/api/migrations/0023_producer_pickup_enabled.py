from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_producer_delivery_zones'),
    ]

    operations = [
        migrations.AddField(
            model_name='producer',
            name='pickup_enabled',
            field=models.BooleanField(default=False),
        ),
    ]

