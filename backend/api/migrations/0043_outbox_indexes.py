from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0042_giftproduct_create"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="outboxevent",
            index=models.Index(fields=["status", "next_attempt_at"], name="outbox_status_next_attempt"),
        ),
        migrations.AddIndex(
            model_name="outboxevent",
            index=models.Index(fields=["status", "created_at"], name="outbox_status_created"),
        ),
    ]

