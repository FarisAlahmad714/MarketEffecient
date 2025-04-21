#!/bin/bash

# Stop and remove the frontend container
docker-compose stop frontend
docker-compose rm -f frontend

# Rebuild the frontend image
docker-compose build frontend

# Start the frontend container
docker-compose up -d frontend

echo "Frontend has been rebuilt and restarted. Please refresh your browser." 