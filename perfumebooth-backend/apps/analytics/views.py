from django.conf import settings
import hmac
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from rest_framework.throttling import AnonRateThrottle
from .ingestion import accept


class EventThrottle(AnonRateThrottle):
    rate = '120/min'

    def get_cache_key(self, request, view):
        return 'analytics-session:'+request.headers.get('X-Analytics-Session', 'unknown')[:36]


class TrustedStorefront(BasePermission):
    def has_permission(self, request, view):
        key = settings.ANALYTICS_INGEST_KEY
        return bool(key) and hmac.compare_digest(key, request.headers.get('X-Analytics-Key', ''))


class CollectView(APIView):
    authentication_classes = []
    permission_classes = [TrustedStorefront]
    throttle_classes = [EventThrottle]

    def post(self, request):
        if not settings.FIRST_PARTY_ANALYTICS_ENABLED:
            return Response({'detail': 'Analytics disabled'}, status=503)
        if len(request.body) > 8192:
            return Response({'detail': 'Event too large'}, status=413)
        event, token = accept(request.data)
        return Response({'accepted': str(event.pk), 'attribution_token': token}, status=202,
                        headers={'Cache-Control': 'no-store'})
