import hashlib
import json
import math
import re
from urllib.parse import urlsplit

from django.core import signing
from django.conf import settings
from django.db import transaction, DatabaseError
import logging
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Event, OrderAttribution

NAMES = ['page_view', 'view_item', 'view_item_list', 'add_to_cart', 'begin_checkout', 'search', 'search_click', 'web_vital']


class EventInput(serializers.Serializer):
    id = serializers.UUIDField()
    session_id = serializers.UUIDField()
    visitor_id = serializers.UUIDField()
    name = serializers.ChoiceField(choices=NAMES)
    path = serializers.CharField(max_length=200)
    consent = serializers.BooleanField()
    consent_version = serializers.ChoiceField(choices=['2026-10-v1'])
    properties = serializers.JSONField(default=dict)

    def validate(self, data):
        if not data['consent']:
            raise ValidationError('Analytics consent is required.')
        path = data['path']
        if not re.fullmatch(r'/[a-zA-Z0-9/_-]*', path):
            raise ValidationError('Only a sanitized path without query strings is accepted.')
        # Do not retain personal account/order paths, query strings or arbitrary properties.
        if path.startswith(('/account', '/order', '/reset', '/login')):
            data['path'] = '/private'
        props = data['properties']
        if not isinstance(props, dict):
            raise ValidationError('Properties must be an object.')
        allowed = {'product_id', 'quantity', 'query', 'result_count', 'search_id', 'referrer',
                   'device', 'utm_source', 'utm_medium', 'utm_campaign', 'metric', 'metric_id', 'metric_revision', 'value', 'page_type'}
        if set(props)-allowed:
            raise ValidationError('Unsupported analytics properties.')
        clean = {}
        for key, value in props.items():
            if key in {'quantity', 'result_count', 'metric_revision'}:
                if type(value) is not int or not 0 <= value <= 100000:
                    raise ValidationError('Invalid count.')
            elif key == 'value':
                if type(value) not in (float, int) or not math.isfinite(value) or not 0 <= value <= 3600000:
                    raise ValidationError('Invalid measurement.')
            elif not isinstance(value, str) or len(value) > 150:
                raise ValidationError('Invalid text property.')
            elif key == 'referrer':
                try:
                    value = urlsplit(value).hostname or ''
                except ValueError:
                    raise ValidationError('Invalid referrer.')
            elif key in {'query', 'utm_source', 'utm_medium', 'utm_campaign'}:
                value = re.sub(r'\b\d{7,}\b|\S+@\S+', '[redacted]', value).strip().lower()
            clean[key] = value
        if data['name'] == 'web_vital' and (clean.get('metric') not in ['LCP', 'INP', 'CLS'] or 'value' not in clean or not clean.get('metric_id')):
            raise ValidationError('Missing Web Vital measurement.')
        if data['name'] == 'search' and not {'query', 'result_count', 'search_id'} <= clean.keys():
            raise ValidationError('Search needs query, result_count and search_id.')
        if data['name'] == 'search_click' and not {'search_id', 'product_id'} <= clean.keys():
            raise ValidationError('Search click needs search_id and product_id.')
        data['properties'] = clean
        return data


@transaction.atomic
def accept(data):
    serializer = EventInput(data=data)
    serializer.is_valid(raise_exception=True)
    values = dict(serializer.validated_data)
    values.pop('consent')
    fingerprint = hashlib.sha256(json.dumps(values, sort_keys=True, default=str).encode()).hexdigest()
    event, created = Event.objects.get_or_create(id=values.pop('id'), defaults={**values, 'fingerprint': fingerprint})
    if event.fingerprint != fingerprint:
        raise ValidationError('Event ID reused with different data.')
    token = signing.dumps({'session': str(event.session_id), 'visitor': str(event.visitor_id)}, salt='analytics-attribution')
    return event, token


def attach_order(order, token):
    if not token or not settings.FIRST_PARTY_ANALYTICS_ENABLED:
        return
    try:
        data = signing.loads(token, salt='analytics-attribution', max_age=1800)
    except signing.BadSignature:
        return  # Analytics must never block commerce.
    try:
        with transaction.atomic():
            OrderAttribution.objects.get_or_create(order=order, defaults={'session_id': data['session'], 'visitor_id': data['visitor']})
    except DatabaseError:
        logging.getLogger(__name__).warning('Analytics attribution unavailable; checkout continues without attribution.')
