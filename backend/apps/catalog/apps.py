"""Catalog app configuration."""
from django.apps import AppConfig


class CatalogConfig(AppConfig):
    """Catalog domain application configuration."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.catalog'
    verbose_name = 'Catalog'
