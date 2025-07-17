#!/bin/bash
# Project setup script

set -e

if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    cd frontend
    npm install
    npm run build
    cd ..
fi

if [ -f "backend/requirements.txt" ]; then
    pip install -r backend/requirements.txt
fi

echo "Setup completed"