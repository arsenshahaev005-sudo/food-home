"""Domain applications package.

This package contains all domain-specific Django applications organized by business domain.
Each app is self-contained with its own models, views, serializers, and business logic.
"""

# Export all domain app configs for easy importing
from apps.cart.apps import CartConfig
from apps.catalog.apps import CatalogConfig
from apps.orders.apps import OrdersConfig
from apps.payments.apps import PaymentsConfig
from apps.producers.apps import ProducersConfig
from apps.users.apps import UsersConfig

__all__ = [
    'UsersConfig',
    'CatalogConfig',
    'OrdersConfig',
    'ProducersConfig',
    'CartConfig',
    'PaymentsConfig',
]
