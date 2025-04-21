from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class OHLC(BaseModel):
    open: float
    high: float
    low: float
    close: float

class TestQuestion(BaseModel):
    id: int
    setup_chart_url: str
    date: date
    timeframe: str  # 4h, daily, weekly, monthly
    ohlc: OHLC

class TestAnswerSubmit(BaseModel):
    test_id: int
    prediction: str  # "Bullish" or "Bearish"

class TestAnswerResponse(BaseModel):
    test_id: int
    user_prediction: str
    correct_answer: str
    is_correct: bool
    setup_chart_url: str
    outcome_chart_url: str
    date: date
    outcome_date: Optional[date] = None
    timeframe: str
    ohlc: OHLC
    outcome_ohlc: Optional[OHLC] = None

class TestResult(BaseModel):
    score: int
    total: int
    answers: List[TestAnswerResponse]
    asset_symbol: str
    asset_name: str

class TestSession(BaseModel):
    session_id: str
    questions: List[TestQuestion]
    asset_symbol: str
    asset_name: str
    selected_timeframe: str  # The timeframe selected for this test (or 'random')

# Schema for timeframe selection
class TimeframeSelection(BaseModel):
    timeframe: str  # '4h', 'daily', 'weekly', 'monthly', 'random'