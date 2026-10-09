import hashlib
import ipaddress
import io
import socket
import time
from urllib.parse import urljoin, urlparse

import requests
from PIL import Image


import functools

MAX_IMAGE_BYTES = 30 * 1024 * 1024
MAX_REDIRECTS = 3
MAX_DOWNLOAD_ATTEMPTS = 5
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
ALLOWED_FORMATS = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp', 'GIF': 'gif'}


@functools.lru_cache(maxsize=256)
def _resolve_host_ips(hostname, port):
    last_exc = None
    for attempt in range(3):
        try:
            addresses = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
            return [ipaddress.ip_address(addr[4][0]) for addr in addresses]
        except socket.gaierror as exc:
            last_exc = exc
            time.sleep(0.2 * (attempt + 1))
    raise ValueError('Image host could not be resolved.') from last_exc


def _validate_public_https_url(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Image URL must be public HTTPS without embedded credentials.')
    ips = _resolve_host_ips(parsed.hostname, parsed.port or 443)
    for ip in ips:
        if not ip.is_global:
            raise ValueError('Private, loopback, link-local, and reserved image hosts are not allowed.')


def _get_with_retries(url, session=None):
    client = session or requests
    last_error = None
    for attempt in range(MAX_DOWNLOAD_ATTEMPTS):
        try:
            response = client.get(
                url, stream=True, allow_redirects=False, timeout=(5, 20),
                headers={'User-Agent': 'PerfumeBooth-Catalog-Importer/1.0'},
            )
            if response.status_code not in RETRYABLE_STATUS_CODES:
                return response
            last_error = requests.HTTPError(
                f'Image host returned retryable HTTP {response.status_code}.', response=response
            )
            response.close()
        except (requests.ConnectionError, requests.Timeout) as exc:
            last_error = exc
        if attempt < MAX_DOWNLOAD_ATTEMPTS - 1:
            time.sleep(2 ** attempt)
    raise ValueError(
        f'Image host is temporarily unreachable after {MAX_DOWNLOAD_ATTEMPTS} attempts.'
    ) from last_error


def download_catalog_image(url, session=None):
    """Download and verify a public image with bounded redirects, time, and size."""
    current = url
    response = None
    for _ in range(MAX_REDIRECTS + 1):
        _validate_public_https_url(current)
        response = _get_with_retries(current, session=session)
        if response.is_redirect or response.is_permanent_redirect:
            location = response.headers.get('Location')
            response.close()
            if not location:
                raise ValueError('Image redirect did not include a destination.')
            current = urljoin(current, location)
            continue
        break
    else:
        raise ValueError('Image URL has too many redirects.')
    try:
        response.raise_for_status()
        content_type = response.headers.get('Content-Type', '').split(';', 1)[0].lower()
        if content_type not in {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}:
            raise ValueError('URL must return a JPEG, PNG, WebP, or GIF image.')
        declared_size = int(response.headers.get('Content-Length') or 0)
        limit_mb = MAX_IMAGE_BYTES // (1024 * 1024)
        if declared_size > MAX_IMAGE_BYTES:
            raise ValueError(f'Image exceeds the {limit_mb} MB limit.')
        content = bytearray()
        for chunk in response.iter_content(64 * 1024):
            content.extend(chunk)
            if len(content) > MAX_IMAGE_BYTES:
                raise ValueError(f'Image exceeds the {limit_mb} MB limit.')
    finally:
        response.close()
    try:
        with Image.open(io.BytesIO(content)) as image:
            image.verify()
        with Image.open(io.BytesIO(content)) as image:
            image_format = image.format
            width, height = image.size
    except Exception as exc:
        raise ValueError('Downloaded content is not a valid image.') from exc
    if image_format not in ALLOWED_FORMATS:
        raise ValueError('Downloaded image format is not supported.')
    digest = hashlib.sha256(content).hexdigest()
    return bytes(content), f'{digest}.{ALLOWED_FORMATS[image_format]}', width, height
