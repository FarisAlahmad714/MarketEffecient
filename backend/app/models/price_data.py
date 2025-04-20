from sqlalchemy import Column, Integer, Float, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class PriceData(BaseModel):
    """Model for storing OHLC data for assets"""
    __tablename__ = "price_data"
    
    asset_id = Column(Integer, ForeignKey("assets.id"))
    date = Column(Date, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float, nullable=True)
    
    # Relationship
    asset = relationship("Asset", backref="price_data")
    
    def __repr__(self):
        return f"<PriceData {self.asset.symbol} - {self.date}: O:{self.open} H:{self.high} L:{self.low} C:{self.close}>"