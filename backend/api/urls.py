from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    ProducerViewSet,
    DishViewSet,
    CategoryViewSet,
    OrderViewSet,
    AddressViewSet,
    CartView,
    CartAddView,
    CartRemoveView,
    CartClearView,
    ChatMessageViewSet,
    ChatComplaintViewSet,
    ReviewViewSet,
    PromoCodeViewSet,
    PaymentMethodViewSet,
    UserDeviceViewSet,
    NotificationViewSet,
    HelpArticleViewSet,
    BecomeSellerView,
    ProfileChangeView,
    ProfileChangeConfirmView,
    PaymentViewSet,
    OrderPayView,
    OrderRescheduleDeliveryView,
    OrderApproveRescheduleView,
    OrderCancelLateDeliveryView,
    GiftCreateView,
    GiftBulkCreateView,
    GiftPreviewView,
    GiftActivateView,
    GiftCancelView,
    GiftStatusView,
    GiftMyListView,
    GiftStatsView,
    GiftNotificationSettingsView,
    OrderUpdateGiftDetailsView,
    OrderDraftViewSet,
    SearchHistoryViewSet,
    SavedSearchViewSet,
    FavoriteDishViewSet,
    ReorderView,
)


router = DefaultRouter()
router.register(r'producers', ProducerViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'dishes', DishViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'messages', ChatMessageViewSet)
router.register(r'complaints', ChatComplaintViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'promocodes', PromoCodeViewSet)
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'devices', UserDeviceViewSet, basename='device')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'help-articles', HelpArticleViewSet, basename='help-article')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'order-drafts', OrderDraftViewSet, basename='order-draft')
router.register(r'search-history', SearchHistoryViewSet, basename='search-history')
router.register(r'saved-searches', SavedSearchViewSet, basename='saved-search')
router.register(r'favorites', FavoriteDishViewSet, basename='favorite')


urlpatterns = [
    path('', include(router.urls)),
    path('cart/', CartView.as_view()),
    path('cart/add/', CartAddView.as_view()),
    path('cart/remove/', CartRemoveView.as_view()),
    path('cart/clear/', CartClearView.as_view()),
    path('become-seller/', BecomeSellerView.as_view()),
    path('profile/change-request/', ProfileChangeView.as_view()),
    path('profile/change-confirm/', ProfileChangeConfirmView.as_view()),
    path('orders/<uuid:pk>/pay/', OrderPayView.as_view()),
    path('orders/<uuid:pk>/reschedule_delivery/', OrderRescheduleDeliveryView.as_view()),
    path('orders/<uuid:pk>/approve_reschedule/', OrderApproveRescheduleView.as_view()),
    path('orders/<uuid:pk>/cancel_late_delivery/', OrderCancelLateDeliveryView.as_view()),
    path('orders/<uuid:pk>/update_gift_details/', OrderUpdateGiftDetailsView.as_view()),
    path('orders/reorder/', ReorderView.as_view()),
    path('gifts/', GiftCreateView.as_view()),
    path('gifts/bulk/', GiftBulkCreateView.as_view()),
    path('gifts/preview/<str:activation_token>/', GiftPreviewView.as_view()),
    path('gifts/activate/<str:activation_token>/', GiftActivateView.as_view()),
    path('gifts/<uuid:gift_id>/cancel/', GiftCancelView.as_view()),
    path('gifts/<uuid:gift_id>/', GiftStatusView.as_view()),
    path('gifts/my/', GiftMyListView.as_view()),
    path('gifts/settings/', GiftNotificationSettingsView.as_view()),
    path('gifts/stats/', GiftStatsView.as_view()),
]
