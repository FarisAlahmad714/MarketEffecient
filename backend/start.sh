#!/bin/bash
set -e

# Run alembic migrations
echo "Running database migrations..."
python /app/run_migrations.py

# Start the application
echo "Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 