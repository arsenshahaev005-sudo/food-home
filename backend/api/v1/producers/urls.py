"""Producers API v1 URL configuration."""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProducerViewSet

router = DefaultRouter()
router.register(r'producers', ProducerViewSet)

urlpatterns = router.urls
