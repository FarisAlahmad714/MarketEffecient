from sqlalchemy import Column, String, Boolean
from app.models.base import BaseModel

class Asset(BaseModel):
    """Model for representing assets (crypto or equity)"""
    __tablename__ = "assets"
    
    symbol = Column(String, unique=True, index=True)
    name = Column(String)
    api_id = Column(String)  # For external API reference (e.g., "bitcoin" for CoinGecko)
    type = Column(String)  # "crypto" or "equity"
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<Asset {self.symbol}: {self.name}>"