from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import random
import os

from app.database import get_db
from app.models.asset import Asset
from app.models.test_data import TestData
from app.models.user_result import UserResult
from app.schemas import TestSession, TestAnswerSubmit, TestResult, TestQuestion, OHLC, TimeframeSelection, OHLCPoint, TestAnswerResponse
from app.services.data_service import TIMEFRAME_4H, TIMEFRAME_DAILY, TIMEFRAME_WEEKLY, TIMEFRAME_MONTHLY, VALID_TIMEFRAMES
from app.services import chart_service
from app.config import settings

router = APIRouter()

async def get_or_generate_chart(test_data: TestData, db: Session):
    """Check if chart exists and generate if missing"""
    # Skip this function if we're using OHLC data instead
    # Only for backward compatibility with existing tests
    if not test_data.setup_chart_path or not test_data.outcome_chart_path:
        return False
        
    # Check setup chart
    setup_chart_path = f"{settings.CHARTS_DIR}/{test_data.setup_chart_path}"
    outcome_chart_path = f"{settings.CHARTS_DIR}/{test_data.outcome_chart_path}"
    
    charts_generated = False
    
    # If either chart is missing, generate both
    if not os.path.exists(setup_chart_path) or not os.path.exists(outcome_chart_path):
        charts_generated = await chart_service.generate_chart_async(test_data, db)
    
    return charts_generated

async def get_ohlc_data_for_test(test_data: TestData, db: Session):
    """Get OHLC data for a test"""
    # Get the asset for this test
    asset = db.query(Asset).filter(Asset.id == test_data.asset_id).first()
    if not asset:
        return None, None
        
    # Get OHLC data
    setup_ohlc, outcome_ohlc = await chart_service.get_ohlc_data(
        db=db,
        asset=asset,
        date_n=test_data.date,
        timeframe=test_data.timeframe
    )
    
    return setup_ohlc, outcome_ohlc

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
        # For backward compatibility, check if charts need to be generated
        if test.setup_chart_path and test.outcome_chart_path:
            await get_or_generate_chart(test, db)
        
        # Get the asset for this test
        asset = db.query(Asset).filter(Asset.id == test.asset_id).first()
        if not asset:
            continue
            
        asset_ids.add(asset.id)
        
        # Get OHLC data for the date and timeframe
        from app.models.price_data import PriceData
        ohlc_data = db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.date == test.date,
            PriceData.timeframe == test.timeframe
        ).first()
        
        # Get OHLC data arrays for charts
        setup_ohlc_array, _ = await get_ohlc_data_for_test(test, db)
        
        if ohlc_data:
            # Prepare question with OHLC data
            question = TestQuestion(
                id=test.id,
                date=test.date,
                timeframe=test.timeframe,
                ohlc=OHLC(
                    open=ohlc_data.open,
                    high=ohlc_data.high,
                    low=ohlc_data.low,
                    close=ohlc_data.close
                ),
                ohlc_data=setup_ohlc_array
            )
            
            # For backward compatibility, add chart URLs if they exist
            if test.setup_chart_path:
                question.setup_chart_url = f"/static/{test.setup_chart_path}"
                
            questions.append(question)
    
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
        # For backward compatibility, check if charts need to be generated
        if test.setup_chart_path and test.outcome_chart_path:
            await get_or_generate_chart(test, db)
        
        # Get OHLC data for the date and timeframe
        from app.models.price_data import PriceData
        ohlc_data = db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.date == test.date,
            PriceData.timeframe == test.timeframe
        ).first()
        
        # Get OHLC data arrays for charts
        setup_ohlc_array, _ = await get_ohlc_data_for_test(test, db)
        
        if ohlc_data:
            # Prepare question with OHLC data
            question = TestQuestion(
                id=test.id,
                date=test.date,
                timeframe=test.timeframe,
                ohlc=OHLC(
                    open=ohlc_data.open,
                    high=ohlc_data.high,
                    low=ohlc_data.low,
                    close=ohlc_data.close
                ),
                ohlc_data=setup_ohlc_array
            )
            
            # For backward compatibility, add chart URLs if they exist
            if test.setup_chart_path:
                question.setup_chart_url = f"/static/{test.setup_chart_path}"
                
            questions.append(question)
    
    return TestSession(
        session_id=new_session_id,
        questions=questions,
        asset_symbol=asset_symbol,
        asset_name=asset.name,
        selected_timeframe=timeframe
    )

@router.post("/test/{asset_symbol}", response_model=TestResult)
async def submit_test_answers(
    asset_symbol: str,
    answer_data: List[TestAnswerSubmit],
    session_id: str,
    db: Session = Depends(get_db)
):
    """Submit test answers and get results"""
    # Check if session exists by checking if any results exist for this session
    existing_results = db.query(UserResult).filter(UserResult.session_id == session_id).all()
    if existing_results:
        # Results already exist, redirect to results page
        result = await get_test_results(asset_symbol, session_id, db)
        return result
    
    # Validate asset if not random
    asset = None
    if asset_symbol != "random":
        asset = db.query(Asset).filter(Asset.symbol == asset_symbol.lower()).first()
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset with symbol {asset_symbol} not found")
    
    # Process each answer
    score = 0
    total = len(answer_data)
    answer_responses = []
    
    for answer in answer_data:
        # Get the test data
        test = db.query(TestData).filter(TestData.id == answer.test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail=f"Test with ID {answer.test_id} not found")
        
        # Get the asset for this test
        test_asset = db.query(Asset).filter(Asset.id == test.asset_id).first()
        if not test_asset:
            raise HTTPException(status_code=404, detail=f"Asset for test ID {answer.test_id} not found")
        
        # For backward compatibility, check if charts need to be generated
        if test.setup_chart_path and test.outcome_chart_path:
            await get_or_generate_chart(test, db)
        
        # Get OHLC data for the setup and outcome dates
        from app.models.price_data import PriceData
        setup_ohlc = db.query(PriceData).filter(
            PriceData.asset_id == test.asset_id,
            PriceData.date == test.date,
            PriceData.timeframe == test.timeframe
        ).first()
        
        # Get the next date after test.date for the outcome
        next_day = db.query(PriceData).filter(
            PriceData.asset_id == test.asset_id,
            PriceData.date > test.date,
            PriceData.timeframe == test.timeframe
        ).order_by(PriceData.date).first()
        
        # Get OHLC data arrays
        setup_ohlc_array, outcome_ohlc_array = await get_ohlc_data_for_test(test, db)
        
        outcome_ohlc = None
        outcome_date = None
        if next_day:
            outcome_ohlc = next_day
            outcome_date = next_day.date
        
        # Check if the answer is correct
        is_correct = answer.prediction == test.correct_bias
        if is_correct:
            score += 1
        
        # Create a user result record
        user_result = UserResult(
            session_id=session_id,
            test_id=test.id,
            user_prediction=answer.prediction,
            is_correct=is_correct
        )
        db.add(user_result)
        
        # Create a default OHLC object if setup_ohlc is None
        default_ohlc = OHLC(open=0.0, high=0.0, low=0.0, close=0.0)

        # Prepare the answer response
        answer_response = TestAnswerResponse(
            test_id=test.id,
            user_prediction=answer.prediction,
            correct_answer=test.correct_bias,
            is_correct=is_correct,
            date=test.date,
            outcome_date=outcome_date,
            timeframe=test.timeframe,
            ohlc_data=setup_ohlc_array,
            outcome_ohlc_data=outcome_ohlc_array,
            ohlc=OHLC(
                open=setup_ohlc.open if setup_ohlc else 0.0,
                high=setup_ohlc.high if setup_ohlc else 0.0,
                low=setup_ohlc.low if setup_ohlc else 0.0,
                close=setup_ohlc.close if setup_ohlc else 0.0
            ),
            outcome_ohlc=OHLC(
                open=next_day.open if next_day else 0.0,
                high=next_day.high if next_day else 0.0,
                low=next_day.low if next_day else 0.0,
                close=next_day.close if next_day else 0.0
            ) if next_day else None
        )
        
        # For backward compatibility, add chart URLs if they exist
        if test.setup_chart_path:
            answer_response.setup_chart_url = f"/static/{test.setup_chart_path}"
        if test.outcome_chart_path:
            answer_response.outcome_chart_url = f"/static/{test.outcome_chart_path}"
            
        answer_responses.append(answer_response)
    
    # Commit the user results
    db.commit()
    
    # Get the asset details for the response
    asset_name = "Random Mix"
    if asset:
        asset_name = asset.name
    
    # Return the test result
    return TestResult(
        score=score,
        total=total,
        answers=answer_responses,
        asset_symbol=asset_symbol,
        asset_name=asset_name
    )

@router.get("/results/{asset_symbol}", response_model=TestResult)
async def get_test_results(
    asset_symbol: str,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get results for a previously submitted test"""
    # Get user results for this session
    user_results = db.query(UserResult).filter(UserResult.session_id == session_id).all()
    if not user_results:
        raise HTTPException(status_code=404, detail=f"No results found for session ID {session_id}")
    
    # Process the results
    score = 0
    total = len(user_results)
    answer_responses = []
    
    for result in user_results:
        # Get the test data
        test = db.query(TestData).filter(TestData.id == result.test_id).first()
        if not test:
            continue
        
        # Get the asset for this test
        test_asset = db.query(Asset).filter(Asset.id == test.asset_id).first()
        if not test_asset:
            continue
        
        # For backward compatibility, check if charts need to be generated
        if test.setup_chart_path and test.outcome_chart_path:
            await get_or_generate_chart(test, db)
        
        # Get OHLC data for the setup and outcome dates
        from app.models.price_data import PriceData
        setup_ohlc = db.query(PriceData).filter(
            PriceData.asset_id == test.asset_id,
            PriceData.date == test.date,
            PriceData.timeframe == test.timeframe
        ).first()
        
        # Get the next date after test.date for the outcome
        next_day = db.query(PriceData).filter(
            PriceData.asset_id == test.asset_id,
            PriceData.date > test.date,
            PriceData.timeframe == test.timeframe
        ).order_by(PriceData.date).first()
        
        # Get OHLC data arrays
        setup_ohlc_array, outcome_ohlc_array = await get_ohlc_data_for_test(test, db)
        
        outcome_ohlc = None
        outcome_date = None
        if next_day:
            outcome_ohlc = next_day
            outcome_date = next_day.date
        
        if result.is_correct:
            score += 1
        
        # Create a default OHLC object if setup_ohlc is None
        default_ohlc = OHLC(open=0.0, high=0.0, low=0.0, close=0.0)

        # Prepare the answer response
        answer_response = TestAnswerResponse(
            test_id=test.id,
            user_prediction=result.user_prediction,
            correct_answer=test.correct_bias,
            is_correct=result.is_correct,
            date=test.date,
            outcome_date=outcome_date,
            timeframe=test.timeframe,
            ohlc_data=setup_ohlc_array,
            outcome_ohlc_data=outcome_ohlc_array,
            ohlc=OHLC(
                open=setup_ohlc.open if setup_ohlc else 0.0,
                high=setup_ohlc.high if setup_ohlc else 0.0,
                low=setup_ohlc.low if setup_ohlc else 0.0,
                close=setup_ohlc.close if setup_ohlc else 0.0
            ),
            outcome_ohlc=OHLC(
                open=next_day.open if next_day else 0.0,
                high=next_day.high if next_day else 0.0,
                low=next_day.low if next_day else 0.0,
                close=next_day.close if next_day else 0.0
            ) if next_day else None
        )
        
        # For backward compatibility, add chart URLs if they exist
        if test.setup_chart_path:
            answer_response.setup_chart_url = f"/static/{test.setup_chart_path}"
        if test.outcome_chart_path:
            answer_response.outcome_chart_url = f"/static/{test.outcome_chart_path}"
            
        answer_responses.append(answer_response)
    
    # Determine the asset name
    asset_name = "Random Mix"
    if asset_symbol != "random":
        asset = db.query(Asset).filter(Asset.symbol == asset_symbol.lower()).first()
        if asset:
            asset_name = asset.name
    
    # Return the test result
    return TestResult(
        score=score,
        total=total,
        answers=answer_responses,
        asset_symbol=asset_symbol,
        asset_name=asset_name
    )