@echo off
echo Stopping existing containers...
docker-compose down

echo Starting the database container...
docker-compose up -d db
timeout /t 5

echo Running migrations...
docker-compose run --rm migration

echo Running database initialization to generate test data for all timeframes...
docker-compose run --rm init-db

echo Starting all services...
docker-compose up -d

echo Database reset and initialized with test data for all timeframes.
echo Application is now running. Visit http://localhost:3000 in your browser. 