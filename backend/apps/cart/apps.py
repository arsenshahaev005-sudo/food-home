"""Cart app configuration."""
from django.apps import AppConfig


class CartConfig(AppConfig):
    """Cart domain application configuration."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cart'
    verbose_name = 'Cart'
