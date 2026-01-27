"""Catalog API v1 URL configuration."""
from rest_framework.routers import DefaultRouter

from .views import CatalogViewSet

router = DefaultRouter()
router.register(r'catalog', CatalogViewSet)

urlpatterns = router.urls
