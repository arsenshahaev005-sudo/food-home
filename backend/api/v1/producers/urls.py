"""Producers API v1 URL configuration."""
from rest_framework.routers import DefaultRouter

from .views import ProducerViewSet

router = DefaultRouter()
router.register(r'producers', ProducerViewSet)

urlpatterns = router.urls
