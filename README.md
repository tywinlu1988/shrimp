# Shrimp

This project is a minimal demo of an AI-assisted shopping assistant.
It provides a backend API built with Flask and Celery and a simple
front-end for demonstration purposes.

## Setup

```bash
./install.sh
```

This installs required dependencies and builds the frontend.

## Running

```bash
cd backend
python app.py
```

Celery workers can be started with:

```bash
celery -A backend.celery_app worker --loglevel=info
```

