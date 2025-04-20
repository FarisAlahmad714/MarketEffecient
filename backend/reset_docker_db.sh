#!/bin/bash

echo "Stopping existing containers..."
docker-compose down

echo "Starting the database container..."
docker-compose up -d db
sleep 5  # Give the database time to start

echo "Running database initialization to generate test data for all timeframes..."
docker-compose run --rm init-db

echo "Starting all services..."
docker-compose up -d

echo "Database reset and initialized with test data for all timeframes." 