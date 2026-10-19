"""
Django Settings — PerfumeBooth Backend
All secrets are read from environment variables (via python-decouple).
Docker populates these from .env.docker; local dev uses a .env file.
"""
import sys
from datetime import timedelta
from pathlib import Path
# pyrefly: ignore [missing-import]
from decouple import config, Csv

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ─────────────────────────────────────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────────────────────────────────────
IS_TESTING = 'test' in sys.argv
DEBUG = config('DJANGO_DEBUG', default=True, cast=bool)
if DEBUG or IS_TESTING:
    SECRET_KEY = config('DJANGO_SECRET_KEY', default='django-insecure-local-development-only')
else:
    # A production deployment must never start with a known signing key.
    SECRET_KEY = config('DJANGO_SECRET_KEY')
ALLOWED_HOSTS = ['*'] if DEBUG else config('ALLOWED_HOSTS', default=config('DJANGO_ALLOWED_HOSTS', default='localhost,django,127.0.0.1'), cast=Csv())

# CORS settings for storefront and admin portal communication
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=True, cast=bool)
CORS_ALLOW_CREDENTIALS = True

# CSRF Trusted Origins for local network and dev servers
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://192.168.31.168:3000',
    'http://192.168.31.168:3001',
]

if DEBUG:
    for i in range(1, 255):
        CSRF_TRUSTED_ORIGINS.extend([
            f'http://192.168.31.{i}:3000',
            f'http://192.168.31.{i}:3001',
        ])


# ─────────────────────────────────────────────────────────────────────────────
# Installed Applications
# ─────────────────────────────────────────────────────────────────────────────
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_celery_results',
    'django_extensions',
    'storages',
]

LOCAL_APPS = [
    'apps.authentication',
    'apps.shop',
    'apps.orders',
    'apps.cms',
    'apps.checkout',
    'apps.catalog',
    'apps.inventory',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─────────────────────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'core.middleware.RequestIDMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'corsheaders.middleware.CorsMiddleware',      # Must be before CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'
AUTH_USER_MODEL = 'authentication.CustomUser'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─────────────────────────────────────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────────────────────────────────────
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# ─────────────────────────────────────────────────────────────────────────────
# Database — PostgreSQL with pgvector (SQLite in-memory for testing)
# ─────────────────────────────────────────────────────────────────────────────
if 'test' in sys.argv and not config('TEST_POSTGRES', default=False, cast=bool):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('POSTGRES_DB', default='perfumebooth'),
            'USER': config('POSTGRES_USER', default='perfume_user'),
            'PASSWORD': config('POSTGRES_PASSWORD', default=''),
            'HOST': config('POSTGRES_HOST', default='postgres'),
            'PORT': config('POSTGRES_PORT', default='5432'),
            'CONN_MAX_AGE': 60,           # Persistent connections (seconds)
            'OPTIONS': {
                'connect_timeout': 10,
            },
        }
    }
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': config('REDIS_URL', default='redis://redis:6379/0'),
            'KEY_PREFIX': 'perfumebooth',
            'TIMEOUT': 3600,              # Default TTL: 1 hour
        }
    }

# ─────────────────────────────────────────────────────────────────────────────
# Celery — Redis DB 1 (broker) + DB 2 (results)
# ─────────────────────────────────────────────────────────────────────────────
if 'test' in sys.argv:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = 'cache+locmem://'
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
else:
    CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://redis:6379/1')
    CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://redis:6379/2')
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60     # Hard limit: 30 minutes per task
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60

# Route tasks to isolated queues (matching Docker Compose worker containers)
CELERY_TASK_ROUTES = {
    'apps.shop.tasks.process_bulk_csv_import':    {'queue': 'imports'},
    'apps.shop.tasks.process_catalog_preview_job': {'queue': 'imports'},
    'apps.shop.tasks.apply_catalog_import_job': {'queue': 'imports'},
    'apps.orders.tasks.send_order_email_receipt': {'queue': 'emails'},
    'apps.shop.tasks.generate_product_embeddings':{'queue': 'ai_tasks'},
    'apps.inventory.tasks.release_expired_inventory_reservations': {'queue': 'default'},
}

CELERY_BEAT_SCHEDULE = {
    'scheduled-catalog-prices': {'task': 'apps.shop.tasks.run_scheduled_imports', 'schedule': 30.0},
    'payment-outbox': {'task': 'apps.orders.tasks.process_payment_outbox', 'schedule': 15.0},
    'payment-reconciliation': {'task': 'apps.orders.tasks.reconcile_payments', 'schedule': 60.0},
    'release-expired-inventory-reservations': {
        'task': 'apps.inventory.tasks.release_expired_inventory_reservations',
        'schedule': 60.0,
    },
}

INVENTORY_RESERVATION_MINUTES = config('INVENTORY_RESERVATION_MINUTES', default=15, cast=int)

# ─────────────────────────────────────────────────────────────────────────────
# Django REST Framework
# ─────────────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'core.authentication.CsrfExemptSessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'core.responses.StandardJSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'COERCE_DECIMAL_TO_STRING': True,
    'EXCEPTION_HANDLER': 'core.exceptions.sanitized_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('THROTTLE_ANON_RATE', default='120/minute'),
        'user': config('THROTTLE_USER_RATE', default='600/minute'),
        'auth': config('THROTTLE_AUTH_RATE', default='10/minute'),
        'otp': config('THROTTLE_OTP_RATE', default='5/minute'),
        'checkout': config('THROTTLE_CHECKOUT_RATE', default='10/minute'),
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}


# ─────────────────────────────────────────────────────────────────────────────
# Environment-Specific Security & Cookies (Dev vs Prod Separation)
# ─────────────────────────────────────────────────────────────────────────────
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # Allows frontend to read csrf cookie for state mutations
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_AGE = 1209600  # Persistent session lasts for 14 days
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'origin',
    'x-csrftoken',
    'x-requested-with',
]

if not DEBUG:
    # ── Production Security Settings ─────────────────────────────────────────
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = config('SESSION_COOKIE_SAMESITE', default='Lax')
    CSRF_COOKIE_SAMESITE = config('CSRF_COOKIE_SAMESITE', default='Lax')

    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool) if 'test' not in sys.argv else False
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # Strict CORS & CSRF — NEVER allow all origins in production
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = config(
        'CORS_ALLOWED_ORIGINS',
        default='https://perfumebooth.com,https://admin.perfumebooth.com',
        cast=Csv(),
    )
    CSRF_TRUSTED_ORIGINS = config(
        'CSRF_TRUSTED_ORIGINS',
        default='https://perfumebooth.com,https://admin.perfumebooth.com',
        cast=Csv(),
    )
else:
    # ── Local Development Security Settings ──────────────────────────────────
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'

    CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=True, cast=bool)
    CORS_ALLOWED_ORIGINS = config(
        'CORS_ALLOWED_ORIGINS',
        default='http://localhost:3000,http://localhost:3001,http://nextjs:3000,http://nextjs:3001,http://127.0.0.1:3000,http://127.0.0.1:3001',
        cast=Csv(),
    )
    CSRF_TRUSTED_ORIGINS = config(
        'CSRF_TRUSTED_ORIGINS',
        default='http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001',
        cast=Csv(),
    )

# ─────────────────────────────────────────────────────────────────────────────
# Static & Media Files
# ─────────────────────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

# Cloudflare R2 / Local Media Storage Dynamic Configuration (R2 active)
USE_R2 = config('USE_R2', default=False, cast=bool)

if USE_R2:
    R2_ACCESS_KEY_ID = config('R2_ACCESS_KEY_ID')
    R2_SECRET_ACCESS_KEY = config('R2_SECRET_ACCESS_KEY')
    R2_STORAGE_BUCKET_NAME = config('R2_BUCKET_NAME')
    R2_S3_ENDPOINT_URL = config('R2_ENDPOINT_URL')  # e.g., https://<account_id>.r2.cloudflarestorage.com
    R2_S3_CUSTOM_DOMAIN = config('R2_CUSTOM_DOMAIN', default=None)  # e.g., media.perfumebooth.com or R2 public domain
    
    # Auto-fallback to local filesystem if credentials are still placeholder values
    if "your_cloudflare" in R2_ACCESS_KEY_ID or "your_bucket_name" in R2_STORAGE_BUCKET_NAME or "<your_cloudflare_account_id>" in R2_S3_ENDPOINT_URL:
        USE_R2 = False

if USE_R2:
    
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "access_key": R2_ACCESS_KEY_ID,
                "secret_key": R2_SECRET_ACCESS_KEY,
                "bucket_name": R2_STORAGE_BUCKET_NAME,
                "endpoint_url": R2_S3_ENDPOINT_URL,
                "custom_domain": R2_S3_CUSTOM_DOMAIN,
                "region_name": "auto",
                "default_acl": None,  # Cloudflare R2 does not support S3 ACLs
                "querystring_auth": False,
            }
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    
    if R2_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f'https://{R2_S3_CUSTOM_DOMAIN}/'
    else:
        # Default R2 public bucket URL fallback if custom domain is not provided
        MEDIA_URL = f'https://{R2_STORAGE_BUCKET_NAME}.r2.dev/'
else:
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'
    
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Internationalisation & Timezone
# ─────────────────────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ─────────────────────────────────────────────────────────────────────────────
# Password Validation
# ─────────────────────────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─────────────────────────────────────────────────────────────────────────────
# Email Configuration (SMTP)
# ─────────────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.resend.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='resend')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='PerfumeBooth <onboarding@resend.dev>')


# ─────────────────────────────────────────────────────────────────────────────
# Third-party API Keys
# ─────────────────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')
RAZORPAY_WEBHOOK_SECRET = config('RAZORPAY_WEBHOOK_SECRET', default='')

SHIPROCKET_API_EMAIL = config('SHIPROCKET_API_EMAIL', default=config('SHIPROCKET_EMAIL', default=''))
SHIPROCKET_API_PASSWORD = config('SHIPROCKET_API_PASSWORD', default=config('SHIPROCKET_PASSWORD', default=''))
SHIPROCKET_EMAIL = SHIPROCKET_API_EMAIL
SHIPROCKET_PASSWORD = SHIPROCKET_API_PASSWORD
SHIPROCKET_PICKUP_PINCODE = config('SHIPROCKET_PICKUP_PINCODE', default='110001')
SHIPROCKET_PICKUP_LOCATION = config('SHIPROCKET_PICKUP_LOCATION', default='Primary Warehouse')
