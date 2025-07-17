"""Backend package initialization."""

from .config import CELERY_BROKER_URL, CELERY_RESULT_BACKEND, TIMEZONE
from celery import Celery

celery_app = Celery('tasks', broker=CELERY_BROKER_URL)
celery_app.conf.update(
    result_backend=CELERY_RESULT_BACKEND,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone=TIMEZONE,
    enable_utc=True,
)

__all__ = ['celery_app']
