"""Gifts app configuration."""
from django.apps import AppConfig


class GiftsConfig(AppConfig):
    """Gifts domain application configuration."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.gifts'
    verbose_name = 'Gifts'
