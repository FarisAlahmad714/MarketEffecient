from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class TestData(BaseModel):
    """Model for storing bias test data"""
    __tablename__ = "test_data"
    
    asset_id = Column(Integer, ForeignKey("assets.id"))
    date = Column(Date)  # The date being tested
    outcome_date = Column(Date, nullable=True)  # The date of the outcome candle (if different from next day)
    timeframe = Column(String, default="daily")  # 4h, daily, weekly, monthly
    setup_chart_path = Column(String)  # Path to the setup chart image
    outcome_chart_path = Column(String)  # Path to the outcome chart image
    correct_bias = Column(String)  # "Bullish" or "Bearish"
    
    # Relationship
    asset = relationship("Asset", backref="test_data")
    
    def __repr__(self):
        return f"<TestData {self.asset.symbol} - {self.date} ({self.timeframe}): {self.correct_bias}>"