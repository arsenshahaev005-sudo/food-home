"""Producers app configuration."""
from django.apps import AppConfig


class ProducersConfig(AppConfig):
    """Producers domain application configuration."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.producers'
    verbose_name = 'Producers'
