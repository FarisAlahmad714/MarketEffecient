from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class UserResult(BaseModel):
    """Model for storing user test results"""
    __tablename__ = "user_results"
    
    test_id = Column(Integer, ForeignKey("test_data.id"))
    user_prediction = Column(String)  # "Bullish" or "Bearish"
    is_correct = Column(Boolean)
    session_id = Column(String, index=True)  # To group results from a single test session
    
    # Relationship
    test = relationship("TestData", backref="user_results")
    
    def __repr__(self):
        return f"<UserResult {self.test.asset.symbol} - {self.test.date}: User:{self.user_prediction} Correct:{self.is_correct}>"