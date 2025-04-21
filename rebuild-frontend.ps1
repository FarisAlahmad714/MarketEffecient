# Stop all containers
Write-Host "Stopping all containers..." -ForegroundColor Yellow
docker-compose down

# Remove the migration container specifically
Write-Host "Removing migration container..." -ForegroundColor Yellow
docker rm -f marketefficient-migration-1 2>$null

# Rebuild the frontend
Write-Host "Rebuilding frontend..." -ForegroundColor Yellow
docker-compose build frontend

# Start all services
Write-Host "Starting all services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Frontend has been rebuilt and all services restarted." -ForegroundColor Green
Write-Host "Please refresh your browser to see the changes." -ForegroundColor Green 