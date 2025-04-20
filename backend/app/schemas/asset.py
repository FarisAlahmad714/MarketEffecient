from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AssetBase(BaseModel):
    symbol: str
    name: str
    api_id: str
    type: str

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    symbol: Optional[str] = None
    name: Optional[str] = None
    api_id: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None

class AssetInDB(AssetBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class Asset(AssetInDB):
    pass