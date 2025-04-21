from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import random

from app.database import get_db
from app.models.asset import Asset
from app.models.test_data import TestData
from app.models.user_result import UserResult
from app.schemas import TestSession, TestAnswerSubmit, TestResult, TestQuestion, OHLC, TimeframeSelection
from app.services.data_service import TIMEFRAME_4H, TIMEFRAME_DAILY, TIMEFRAME_WEEKLY, TIMEFRAME_MONTHLY, VALID_TIMEFRAMES

router = APIRouter()

@router.get("/test/random", response_model=TestSession)
async def get_random_cross_asset_test(
    request: Request, 
    timeframe: Optional[str] = Query("random", description="Timeframe to use (4h, daily, weekly, monthly, random)"),
    session_id: Optional[str] = Query(None, description="Previous session ID for retake"),
    db: Session = Depends(get_db)
):
    """Get random test data from across different assets with optional timeframe filtering"""
    # Get all assets
    assets = db.query(Asset).all()
    if not assets:
        raise HTTPException(status_code=404, detail="No assets found")
    
    # Validate timeframe
    if timeframe != "random" and timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe: {timeframe}. Must be one of: {', '.join(VALID_TIMEFRAMES)} or 'random'")
    
    # Get available tests across all assets
    all_tests = []
    for asset in assets:
        # Filter by timeframe if specified
        query = db.query(TestData).filter(TestData.asset_id == asset.id)
        
        if timeframe != "random":
            query = query.filter(TestData.timeframe == timeframe)
        
        # Get previously answered tests if session_id is provided
        excluded_test_ids = []
        if session_id:
            previous_results = db.query(UserResult).filter(UserResult.session_id == session_id).all()
            excluded_test_ids = [result.test_id for result in previous_results]
            
            # Exclude previously answered tests
            if excluded_test_ids:
                query = query.filter(~TestData.id.in_(excluded_test_ids))
        
        tests = query.all()
        if tests:
            all_tests.extend(tests)
    
    if not all_tests:
        raise HTTPException(status_code=404, detail="No tests available")
    
    # Create a new session ID
    new_session_id = str(uuid.uuid4())
    
    # Randomly select tests
    selected_tests = random.sample(all_tests, min(5, len(all_tests)))
    
    # Format the questions
    questions = []
    asset_ids = set()
    
    for test in selected_tests:
        # Get the asset for this test
        asset = next((a for a in assets if a.id == test.asset_id), None)
        if not asset:
            continue
            
        asset_ids.add(asset.id)
        
        # Get OHLC data for the date and timeframe
        ohlc_data = db.query(asset.price_data).filter(
            PriceData.asset_id == asset.id,
            PriceData.date == test.date,
            PriceData.timeframe == test.timeframe
        ).first()
        
        if ohlc_data:
            questions.append(
                TestQuestion(
                    id=test.id,
                    setup_chart_url=f"/static/{test.setup_chart_path}",
                    date=test.date,
                    timeframe=test.timeframe,
                    ohlc=OHLC(
                        open=ohlc_data.open,
                        high=ohlc_data.high,
                        low=ohlc_data.low,
                        close=ohlc_data.close
                    )
                )
            )
    
    # If we have test questions from different assets, use "random" as the symbol
    # Otherwise, if all questions are from a single asset, use that asset's symbol
    if len(asset_ids) > 1:
        asset_symbol = "random"
        asset_name = "Random Mix"
    else:
        # If only one asset, use that asset's details
        asset = next((a for a in assets if a.id in asset_ids), None)
        asset_symbol = asset.symbol if asset else "random"
        asset_name = asset.name if asset else "Random Mix"
    
    return TestSession(
        session_id=new_session_id,
        questions=questions,
        asset_symbol=asset_symbol,
        asset_name=asset_name,
        selected_timeframe=timeframe
    )

@router.get("/test/{asset_symbol}", response_model=TestSession)
async def get_test_for_asset(
    asset_symbol: str, 
    request: Request, 
    timeframe: Optional[str] = Query("random", description="Timeframe to use (4h, daily, weekly, monthly, random)"),
    session_id: Optional[str] = Query(None, description="Previous session ID for retake"),
    db: Session = Depends(get_db)
):
    """Get test data for a specific asset with optional timeframe filtering"""
    # Find the asset
    asset = db.query(Asset).filter(Asset.symbol == asset_symbol.lower()).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset with symbol {asset_symbol} not found")
    
    # Validate timeframe
    if timeframe != "random" and timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe: {timeframe}. Must be one of: {', '.join(VALID_TIMEFRAMES)} or 'random'")
    
    # Get available tests for this asset
    query = db.query(TestData).filter(TestData.asset_id == asset.id)
    
    # Filter by timeframe if specified
    if timeframe != "random":
        query = query.filter(TestData.timeframe == timeframe)
    
    # Get previously answered tests if session_id is provided for retakes
    excluded_test_ids = []
    if session_id:
        previous_results = db.query(UserResult).filter(UserResult.session_id == session_id).all()
        excluded_test_ids = [result.test_id for result in previous_results]
        
        # Exclude previously answered tests
        if excluded_test_ids:
            query = query.filter(~TestData.id.in_(excluded_test_ids))
    
    tests = query.all()
    
    if not tests:
        available_timeframes = []
        # Check which timeframes have data for this asset
        for tf in VALID_TIMEFRAMES:
            if db.query(TestData).filter(TestData.asset_id == asset.id, TestData.timeframe == tf).first():
                available_timeframes.append(tf)
                
        msg = f"No tests available for {asset.name} with the selected timeframe: {timeframe}."
        if available_timeframes:
            msg += f" Available timeframes: {', '.join(available_timeframes)}"
        else:
            msg += " No tests available for any timeframe. Please run database initialization."
            
        raise HTTPException(status_code=404, detail=msg)
    
    # Create a new session ID
    new_session_id = str(uuid.uuid4())
    
    # Randomly select tests
    selected_tests = random.sample(tests, min(5, len(tests)))
    
    # Format the questions
    questions = []
    for test in selected_tests:
        # Get OHLC data for the date and timeframe
        from app.models.price_data import PriceData
        ohlc_data = db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.date == test.date,
            PriceData.timeframe == test.timeframe
        ).first()
        
        if ohlc_data:
            questions.append(
                TestQuestion(
                    id=test.id,
                    setup_chart_url=f"/static/{test.setup_chart_path}",
                    date=test.date,
                    timeframe=test.timeframe,
                    ohlc=OHLC(
                        open=ohlc_data.open,
                        high=ohlc_data.high,
                        low=ohlc_data.low,
                        close=ohlc_data.close
                    )
                )
            )
    
    return TestSession(
        session_id=new_session_id,
        questions=questions,
        asset_symbol=asset.symbol,
        asset_name=asset.name,
        selected_timeframe=timeframe
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
        
        # For random tests, we don't check if the asset is correct
        if asset_symbol != "random":
            # Check if this is the correct asset
            if test.asset_id != asset.id:
                raise HTTPException(status_code=400, detail="Test does not belong to the specified asset")
        
        # Check if the answer is correct
        is_correct = test.correct_bias == answer.prediction
        if is_correct:
            score += 1
        
        # Get the asset for this test
        test_asset = db.query(Asset).filter(Asset.id == test.asset_id).first()
        
        # Import PriceData model
        from app.models.price_data import PriceData
        
        # Get OHLC data for the setup chart date and timeframe
        setup_ohlc_data = db.query(PriceData).filter(
            PriceData.asset_id == test.asset_id,
            PriceData.date == test.date,
            PriceData.timeframe == test.timeframe
        ).first()
        
        # Determine outcome date based on timeframe
        outcome_date = None
        if test.outcome_date:
            outcome_date = test.outcome_date
        
        # Get OHLC data for the outcome chart
        outcome_ohlc_data = None
        if outcome_date:
            outcome_ohlc_data = db.query(PriceData).filter(
                PriceData.asset_id == test.asset_id,
                PriceData.date == outcome_date,
                PriceData.timeframe == test.timeframe
            ).first()
        
        # If we don't have an explicit outcome date, try to get the next candle's data
        if not outcome_ohlc_data and setup_ohlc_data:
            # Get the next candle after the setup date
            outcome_ohlc_data = db.query(PriceData).filter(
                PriceData.asset_id == test.asset_id,
                PriceData.date > test.date,
                PriceData.timeframe == test.timeframe
            ).order_by(PriceData.date).first()
            
            if outcome_ohlc_data:
                outcome_date = outcome_ohlc_data.date
        
        # Save the result
        result = UserResult(
            test_id=test.id,
            user_prediction=answer.prediction,
            is_correct=is_correct,
            session_id=session_id,
            timeframe=test.timeframe
        )
        db.add(result)
        
        # Prepare the outcome OHLC data if available
        outcome_ohlc = None
        if outcome_ohlc_data:
            outcome_ohlc = {
                "open": outcome_ohlc_data.open,
                "high": outcome_ohlc_data.high,
                "low": outcome_ohlc_data.low,
                "close": outcome_ohlc_data.close
            }
        
        # Add to results list
        results.append({
            "test_id": test.id,
            "user_prediction": answer.prediction,
            "correct_answer": test.correct_bias,
            "is_correct": is_correct,
            "setup_chart_url": f"/static/{test.setup_chart_path}",
            "outcome_chart_url": f"/static/{test.outcome_chart_path}",
            "date": test.date,
            "outcome_date": outcome_date,
            "timeframe": test.timeframe,
            "ohlc": {
                "open": setup_ohlc_data.open if setup_ohlc_data else 0,
                "high": setup_ohlc_data.high if setup_ohlc_data else 0,
                "low": setup_ohlc_data.low if setup_ohlc_data else 0,
                "close": setup_ohlc_data.close if setup_ohlc_data else 0
            },
            "outcome_ohlc": outcome_ohlc
        })
    
    # Commit to database
    db.commit()
    
    # For random tests, use "Random Mix" as the asset name
    if asset_symbol == "random":
        asset_name = "Random Mix"
    else:
        asset_name = asset.name
    
    return TestResult(
        score=score,
        total=len(answers),
        answers=results,
        asset_symbol=asset_symbol,
        asset_name=asset_name
    )