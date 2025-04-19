from fastapi import FastAPI
from app.api.v1.endpoints import auth, charting

app = FastAPI(
    title="Market Efficiency Trading Platform",
    description="A scalable trading education platform",
    version="1.0.0"
)

# Include versioned API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(charting.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to the Market Efficiency Trading Platform"}