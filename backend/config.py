"""Configuration settings for backend services."""

import os

CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
TIMEZONE = os.getenv('TZ', 'Asia/Shanghai')

STATIC_FOLDER = os.path.join(os.path.dirname(__file__), '../frontend/public')
