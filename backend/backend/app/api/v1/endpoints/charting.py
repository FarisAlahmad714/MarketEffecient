from fastapi import APIRouter

router = APIRouter()

# Temporary mock data
@router.get("/chart-data")
async def get_chart_data():
    return [
        {"time": 1696118400, "open": 50000, "high": 51000, "low": 49500, "close": 50500},
        {"time": 1696204800, "open": 50500, "high": 51500, "low": 50000, "close": 51000},
    ]