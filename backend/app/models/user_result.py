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
    timeframe = Column(String, nullable=True)  # Store the timeframe for this test
    
    # Relationship
    test = relationship("TestData", backref="user_results")
    
    def __repr__(self):
        return f"<UserResult test_id:{self.test_id} - prediction:{self.user_prediction} - correct:{self.is_correct}>"