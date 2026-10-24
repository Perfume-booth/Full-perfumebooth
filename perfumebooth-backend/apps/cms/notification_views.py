from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
import hashlib
from .notifications import SubscriptionInput, subscribe, manage


class NotificationThrottle(AnonRateThrottle):
    rate = '10/hour'
    scope = 'notification'

    def get_cache_key(self, request, view):
        # Proxy users share a backend IP: also scope by target email/token.
        data = request.data if isinstance(request.data, dict) else {}
        identity = str(data.get('email') or data.get('token') or '').strip().lower()
        digest = hashlib.sha256(identity.encode()).hexdigest()
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request) + digest}


class SubscribeView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [NotificationThrottle, AnonRateThrottle]
    kind = 'newsletter'

    def post(self, request):
        serializer = SubscriptionInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscribe(serializer.validated_data, self.kind)
        return Response({'success': True, 'message': 'Request saved. If confirmation is needed, check your email and confirm your request.'})


class RestockSubscribeView(SubscribeView):
    kind = 'restock'


class ManageInput(serializers.Serializer):
    token = serializers.UUIDField()
    action = serializers.ChoiceField(choices=['confirm', 'unsubscribe'])


class ManageNotificationView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [NotificationThrottle, AnonRateThrottle]

    def post(self, request):
        serializer = ManageInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': manage(**serializer.validated_data)})
