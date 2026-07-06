"""
PerfumeBooth Global URL Router
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    """Simple health-check endpoint for Docker & load balancer probes."""
    return JsonResponse({'status': 'ok', 'service': 'perfumebooth-api'})


urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # Health check (no auth required)
    path('api/health/', health_check, name='health-check'),

    # Domain API routes
    path('api/auth/', include('apps.authentication.urls')),
    path('api/shop/', include('apps.shop.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/cms/', include('apps.cms.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

