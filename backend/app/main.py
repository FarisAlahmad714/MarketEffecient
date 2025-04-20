from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

import os
import logging

from app.database import get_db, engine
from app.models import base
from app.api.routes import assets, test

# Create static directories if they don't exist
os.makedirs("app/static/crypto", exist_ok=True)
os.makedirs("app/static/equities", exist_ok=True)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Trading Bias Test API",
    description="API for the Trading Bias Test application",
    version="0.1.0",
)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
@app.on_event("startup")
async def startup():
    base.Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

# Mount static files directory
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include API routes
app.include_router(assets.router, prefix="/api", tags=["assets"])
app.include_router(test.router, prefix="/api", tags=["tests"])


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)