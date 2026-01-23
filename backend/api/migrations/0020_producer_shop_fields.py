from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_producer_address'),
    ]

    operations = [
        migrations.AddField(
            model_name='producer',
            name='logo_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='producer',
            name='short_description',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='producer',
            name='main_category',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='main_producers', to='api.category'),
        ),
    ]

