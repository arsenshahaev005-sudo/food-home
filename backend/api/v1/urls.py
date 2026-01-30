"""API v1 URL configuration.

This module aggregates all domain-specific routers into a single URL configuration
for the API v1 namespace.
"""
from rest_framework.routers import DefaultRouter

from api.v1.orders.urls import router as orders_router

# Create unified router
router = DefaultRouter()

# Register orders router
router.registry.extend(orders_router.registry)

# TODO: Add other v1 routers when they are ready
# from api.v1.cart.urls import router as cart_router
# from api.v1.catalog.urls import router as catalog_router
# from api.v1.payments.urls import router as payments_router
# from api.v1.producers.urls import router as producers_router
# from api.v1.reviews.urls import router as reviews_router
# from api.v1.users.urls import router as users_router
# router.registry.extend(users_router.registry)
# router.registry.extend(catalog_router.registry)
# router.registry.extend(producers_router.registry)
# router.registry.extend(cart_router.registry)
# router.registry.extend(payments_router.registry)
# router.registry.extend(reviews_router.registry)

urlpatterns = router.urls
