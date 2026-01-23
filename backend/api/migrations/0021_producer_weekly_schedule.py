from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_producer_shop_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='producer',
            name='weekly_schedule',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

