import os
from celery import Celery

# Set default Django settings module for 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('mediflow_hms')

# Load task modules from all registered Django app configs.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps.
app.autodiscover_tasks()
