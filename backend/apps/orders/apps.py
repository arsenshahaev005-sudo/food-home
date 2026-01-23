"""Orders app configuration."""
from django.apps import AppConfig


class OrdersConfig(AppConfig):
    """Orders domain application configuration."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.orders'
    verbose_name = 'Orders'
