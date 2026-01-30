from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    # Keep old API routes for backward compatibility during migration
    path('api/', include('api.urls')),
    path('api/auth/', include('api.auth_urls')),
    # New API v1 structure
    path('api/v1/', include('api.v1.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
