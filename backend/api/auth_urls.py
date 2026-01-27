from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    EmailLoginView,
    GoogleLoginView,
    ProducerDocumentUploadView,
    ProducerLogoUploadView,
    ProfileView,
    RegisterView,
    RequestPasswordResetView,
    ResendCodeView,
    ResetPasswordView,
    ShopDescriptionAIView,
    Toggle2FAView,
    Verify2FALoginView,
    VerifyRegistrationView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('register/verify/', VerifyRegistrationView.as_view(), name='auth-register-verify'),
    path('login/', EmailLoginView.as_view(), name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('login/google/', GoogleLoginView.as_view(), name='auth-login-google'),
    path('login/verify-2fa/', Verify2FALoginView.as_view(), name='auth-login-verify-2fa'),
    path('resend-code/', ResendCodeView.as_view(), name='auth-resend-code'),
    path('2fa/toggle/', Toggle2FAView.as_view(), name='auth-2fa-toggle'),
    path('me/', ProfileView.as_view(), name='auth-me'),
    path('me/logo/', ProducerLogoUploadView.as_view(), name='auth-me-logo'),
    path('me/documents/upload/', ProducerDocumentUploadView.as_view(), name='auth-me-document-upload'),
    path('me/shop-description/ai/', ShopDescriptionAIView.as_view(), name='auth-me-shop-description-ai'),
    path('password/reset/request/', RequestPasswordResetView.as_view(), name='auth-password-reset-request'),
    path('password/reset/verify/', ResetPasswordView.as_view(), name='auth-password-reset-verify'),
]
