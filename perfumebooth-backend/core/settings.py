"""
Django Settings — PerfumeBooth Backend
All secrets are read from environment variables (via python-decouple).
Docker populates these from .env.docker; local dev uses a .env file.
"""
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
SECRET_KEY = config('DJANGO_SECRET_KEY')
DEBUG = config('DJANGO_DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost', cast=Csv())

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
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─────────────────────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
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
# Database — PostgreSQL with pgvector
# ─────────────────────────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB', default='perfumebooth'),
        'USER': config('POSTGRES_USER', default='perfume_user'),
        'PASSWORD': config('POSTGRES_PASSWORD'),
        'HOST': config('POSTGRES_HOST', default='postgres'),
        'PORT': config('POSTGRES_PORT', default='5432'),
        'CONN_MAX_AGE': 60,           # Persistent connections (seconds)
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Cache — Redis DB 0
# ─────────────────────────────────────────────────────────────────────────────
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
    'apps.orders.tasks.send_order_email_receipt': {'queue': 'emails'},
    'apps.shop.tasks.generate_product_embeddings':{'queue': 'ai_tasks'},
}

# ─────────────────────────────────────────────────────────────────────────────
# Django REST Framework
# ─────────────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '300/minute',
    },
}

# Session & CSRF Cookie Settings for Local Cross-Origin Dev
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # Allows frontend to read csrf cookie
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Survived browser window close
SESSION_COOKIE_AGE = 1209600  # Persistent session lasts for 14 days

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
]



# ─────────────────────────────────────────────────────────────────────────────
# CORS — django-cors-headers
# ─────────────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://nextjs:3000',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'origin',
    'x-csrftoken',
    'x-requested-with',
]

# ─────────────────────────────────────────────────────────────────────────────
# Static & Media Files
# ─────────────────────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

# S3 / Local Media Storage Dynamic Configuration
USE_S3 = config('USE_S3', default=False, cast=bool)

if USE_S3:
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
    AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default=None)
    AWS_S3_ENDPOINT_URL = config('AWS_S3_ENDPOINT_URL', default=None)
    
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "default_acl": "public-read",
                "querystring_auth": False,
            }
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
    else:
        MEDIA_URL = f'https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/'
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
# Third-party API Keys
# ─────────────────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')
RAZORPAY_WEBHOOK_SECRET = config('RAZORPAY_WEBHOOK_SECRET', default='')

SHIPROCKET_API_EMAIL = config('SHIPROCKET_API_EMAIL', default='')
SHIPROCKET_API_PASSWORD = config('SHIPROCKET_API_PASSWORD', default='')
