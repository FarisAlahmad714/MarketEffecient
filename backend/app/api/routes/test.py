from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
import uuid
import random

from app.database import get_db
from app.models.asset import Asset
from app.models.test_data import TestData
from app.models.user_result import UserResult
from app.schemas import TestSession, TestAnswerSubmit, TestResult, TestQuestion, OHLC

router = APIRouter()

@router.get("/test/{asset_symbol}", response_model=TestSession)
async def get_test_for_asset(asset_symbol: str, request: Request, db: Session = Depends(get_db)):
    """Get test data for a specific asset"""
    # Find the asset
    asset = db.query(Asset).filter(Asset.symbol == asset_symbol.lower()).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset with symbol {asset_symbol} not found")
    
    # Get available tests for this asset
    tests = db.query(TestData).filter(TestData.asset_id == asset.id).all()
    if not tests:
        raise HTTPException(status_code=404, detail=f"No tests available for {asset.name}")
    
    # Randomly select tests
    selected_tests = random.sample(tests, min(5, len(tests)))
    
    # Create a session ID
    session_id = str(uuid.uuid4())
    
    # Format the questions
    questions = []
    for test in selected_tests:
        # Get OHLC data for the date
        ohlc_data = next((price_data for price_data in asset.price_data if price_data.date == test.date), None)
        
        if ohlc_data:
            questions.append(
                TestQuestion(
                    id=test.id,
                    setup_chart_url=f"/static/{test.setup_chart_path}",
                    date=test.date,
                    ohlc=OHLC(
                        open=ohlc_data.open,
                        high=ohlc_data.high,
                        low=ohlc_data.low,
                        close=ohlc_data.close
                    )
                )
            )
    
    return TestSession(
        session_id=session_id,
        questions=questions,
        asset_symbol=asset.symbol,
        asset_name=asset.name
    )

@router.post("/test/{asset_symbol}", response_model=TestResult)
async def submit_test_answers(
    asset_symbol: str, 
    answers: List[TestAnswerSubmit], 
    session_id: str, 
    db: Session = Depends(get_db)
):
    """Submit and grade predictions for a test"""
    # Find the asset
    asset = db.query(Asset).filter(Asset.symbol == asset_symbol.lower()).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset with symbol {asset_symbol} not found")
    
    # Process each answer
    score = 0
    results = []
    
    for answer in answers:
        # Get the test data
        test = db.query(TestData).filter(TestData.id == answer.test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail=f"Test with ID {answer.test_id} not found")
        
        # Check if this is the correct asset
        if test.asset_id != asset.id:
            raise HTTPException(status_code=400, detail="Test does not belong to the specified asset")
        
        # Check if the answer is correct
        is_correct = test.correct_bias == answer.prediction
        if is_correct:
            score += 1
        
        # Get OHLC data for the date
        ohlc_data = next((price_data for price_data in asset.price_data if price_data.date == test.date), None)
        
        # Save the result
        result = UserResult(
            test_id=test.id,
            user_prediction=answer.prediction,
            is_correct=is_correct,
            session_id=session_id
        )
        db.add(result)
        
        # Add to results list
        results.append({
            "test_id": test.id,
            "user_prediction": answer.prediction,
            "correct_answer": test.correct_bias,
            "is_correct": is_correct,
            "outcome_chart_url": f"/static/{test.outcome_chart_path}",
            "date": test.date,
            "ohlc": {
                "open": ohlc_data.open if ohlc_data else 0,
                "high": ohlc_data.high if ohlc_data else 0,
                "low": ohlc_data.low if ohlc_data else 0,
                "close": ohlc_data.close if ohlc_data else 0
            }
        })
    
    # Commit to database
    db.commit()
    
    return TestResult(
        score=score,
        total=len(answers),
        answers=results,
        asset_symbol=asset.symbol,
        asset_name=asset.name
    )