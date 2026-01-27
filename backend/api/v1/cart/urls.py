"""Cart API v1 URL configuration."""
from rest_framework.routers import DefaultRouter

from .views import CartViewSet

router = DefaultRouter()
router.register(r'cart', CartViewSet)

urlpatterns = router.urls
