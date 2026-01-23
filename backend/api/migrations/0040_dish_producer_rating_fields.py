from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0039_dispute_opened_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="producer",
            name="rating_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="dish",
            name="rating",
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name="dish",
            name="rating_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="dish",
            name="sort_score",
            field=models.FloatField(default=0),
        ),
    ]

