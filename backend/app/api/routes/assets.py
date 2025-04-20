from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.asset import Asset as AssetModel
from app.schemas import Asset as AssetSchema

router = APIRouter()

@router.get("/assets", response_model=List[AssetSchema])
async def get_assets(db: Session = Depends(get_db)):
    """Get all available assets for testing"""
    assets = db.query(AssetModel).filter(AssetModel.is_active == True).all()
    return assets