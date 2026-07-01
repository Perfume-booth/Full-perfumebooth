"""
Celery application instance for PerfumeBooth.

Four isolated task queues (matching Docker Compose workers):
  • default   — general async tasks
  • imports   — bulk CSV product/inventory imports
  • emails    — transactional email & PDF invoice generation
  • ai_tasks  — pgvector embedding generation
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('perfumebooth')

# Read Celery config from Django settings (CELERY_ prefixed keys)
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks.py files in all installed apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Utility task for verifying worker connectivity."""
    print(f'Request: {self.request!r}')
