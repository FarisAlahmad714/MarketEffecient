from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from .user import Base
from datetime import datetime

class ExamResult(Base):
    __tablename__ = "exam_results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_type = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    total_possible = Column(Integer, nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON)  # For extra data like question breakdown
    user = relationship("User", back_populates="exam_results")

# Add this to user.py to link the relationship
User.exam_results = relationship("ExamResult", order_by=ExamResult.id, back_populates="user")