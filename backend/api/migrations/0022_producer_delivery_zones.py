from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_producer_weekly_schedule'),
    ]

    operations = [
        migrations.AddField(
            model_name='producer',
            name='delivery_zones',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

