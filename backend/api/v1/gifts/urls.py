"""Gifts API v1 URL configuration."""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import GiftViewSet

router = DefaultRouter()
router.register(r'gifts', GiftViewSet)

urlpatterns = router.urls
