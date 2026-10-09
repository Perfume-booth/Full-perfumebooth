from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from apps.shop.image_imports import _get_with_retries


class CatalogImageDownloadRetryTests(SimpleTestCase):
    @patch('apps.shop.image_imports.time.sleep')
    @patch('apps.shop.image_imports.requests.get')
    def test_retries_transient_connection_error(self, get, sleep):
        response = Mock(status_code=200)
        get.side_effect = [requests.ConnectionError('network unreachable'), response]

        self.assertIs(_get_with_retries('https://cdn.example.com/image.jpg'), response)
        self.assertEqual(get.call_count, 2)
        sleep.assert_called_once_with(1)

    @patch('apps.shop.image_imports.time.sleep')
    @patch('apps.shop.image_imports.requests.get')
    def test_retries_rate_limit_and_server_errors(self, get, sleep):
        busy = Mock(status_code=503)
        rate_limited = Mock(status_code=429)
        response = Mock(status_code=200)
        get.side_effect = [busy, rate_limited, response]

        self.assertIs(_get_with_retries('https://cdn.example.com/image.jpg'), response)
        self.assertEqual(get.call_count, 3)
        busy.close.assert_called_once()
        rate_limited.close.assert_called_once()
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [1, 2])

    @patch('apps.shop.image_imports.time.sleep')
    @patch('apps.shop.image_imports.requests.get')
    def test_reports_clear_error_after_retry_budget(self, get, sleep):
        get.side_effect = requests.ConnectionError('network unreachable')

        with self.assertRaisesRegex(ValueError, 'temporarily unreachable after 5 attempts'):
            _get_with_retries('https://cdn.example.com/image.jpg')

        self.assertEqual(get.call_count, 5)
        self.assertEqual(sleep.call_count, 4)
