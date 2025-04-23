import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import mplfinance as mpf
import pandas as pd
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session
import random
import asyncio

from app.models.asset import Asset
from app.models.price_data import PriceData
from app.models.test_data import TestData
from app.config import settings
from app.services.data_service import TIMEFRAME_4H, TIMEFRAME_DAILY, TIMEFRAME_WEEKLY, TIMEFRAME_MONTHLY, VALID_TIMEFRAMES

# Setup logging
logger = logging.getLogger(__name__)

# Number of candles to display in charts based on timeframe
CHART_CANDLES = {
    TIMEFRAME_4H: 60,      # 60 4-hour candles = 10 days
    TIMEFRAME_DAILY: 30,   # 30 daily candles = 1 month
    TIMEFRAME_WEEKLY: 26,  # 26 weekly candles = 6 months
    TIMEFRAME_MONTHLY: 12  # 12 monthly candles = 1 year
}

async def generate_chart_async(test_data: TestData, db: Session):
    """Generate charts for a test data entry on demand"""
    # Get the asset for this test
    asset = db.query(Asset).filter(Asset.id == test_data.asset_id).first()
    if not asset:
        logger.error(f"Asset not found for test_id {test_data.id}")
        return False
    
    # Generate the setup chart
    setup_path = await generate_setup_chart(
        db=db, 
        asset=asset, 
        date_n=test_data.date, 
        timeframe=test_data.timeframe
    )
    
    if not setup_path:
        logger.error(f"Failed to generate setup chart for test_id {test_data.id}")
        return False
    
    # Update the test data with the new chart path if needed
    if test_data.setup_chart_path != setup_path:
        test_data.setup_chart_path = setup_path
        db.commit()
    
    # Generate the outcome chart if needed
    next_day = db.query(PriceData).filter(
        PriceData.asset_id == test_data.asset_id,
        PriceData.date > test_data.date,
        PriceData.timeframe == test_data.timeframe
    ).order_by(PriceData.date).first()
    
    if next_day:
        outcome_path = await generate_outcome_chart(
            db=db, 
            asset=asset, 
            date_n=next_day.date, 
            timeframe=test_data.timeframe
        )
        
        if outcome_path and test_data.outcome_chart_path != outcome_path:
            test_data.outcome_chart_path = outcome_path
            db.commit()
    
    return True

async def generate_setup_chart(db: Session, asset: Asset, date_n, timeframe=TIMEFRAME_DAILY):
    """Generate setup chart for a specific date and timeframe"""
    # Validate timeframe
    if timeframe not in VALID_TIMEFRAMES:
        logger.error(f"Invalid timeframe: {timeframe}")
        timeframe = TIMEFRAME_DAILY  # Default to daily
    
    # Get number of candles to display
    num_candles = CHART_CANDLES.get(timeframe, 30)
    
    # Create directory for asset type
    asset_type = asset.type  # "crypto" or "equity"
    os.makedirs(f"{settings.CHARTS_DIR}/{asset_type}", exist_ok=True)
    
    # Generate chart file name with timeframe included
    setup_path = f"{asset_type}/{asset.symbol}_{date_n.strftime('%Y-%m-%d')}_{timeframe}_setup.png"
    
    # Full path
    full_setup_path = f"{settings.CHARTS_DIR}/{setup_path}"
    
    # Check if chart already exists
    if os.path.exists(full_setup_path):
        logger.info(f"Setup chart already exists for {asset.symbol} - {date_n} ({timeframe})")
        return setup_path
    
    logger.info(f"Generating setup chart for {asset.symbol} - {date_n} ({timeframe})")
    
    # Get price data before and including date_n
    setup_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date <= date_n,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date.desc()).limit(num_candles).all()
    
    if not setup_data or len(setup_data) < 2:
        logger.error(f"Insufficient setup data for {asset.symbol} on/before {date_n} ({timeframe})")
        return None
    
    # Convert to pandas DataFrame
    setup_df = pd.DataFrame([
    {
        "Date": data.date,
        "Open": data.open,
        "High": data.high,
        "Low": data.low,
        "Close": data.close,
        "Volume": 0.0 if data.volume is None else float(data.volume)
    } for data in reversed(setup_data)
    ])
    
    setup_df["Date"] = pd.to_datetime(setup_df["Date"])
    setup_df.set_index("Date", inplace=True)
    
    try:
        # Generate and save chart
        mpf.plot(setup_df, type="candle", style="charles", figscale=1.5, 
                title=f"{asset.symbol} - {timeframe.upper()} Chart", 
                savefig=dict(fname=full_setup_path, dpi=300))
        
        logger.info(f"Generated setup chart for {asset.symbol} - {date_n} ({timeframe})")
        return setup_path
    except Exception as e:
        logger.error(f"Error generating setup chart for {asset.symbol} - {date_n} ({timeframe}): {str(e)}")
        return None

async def generate_outcome_chart(db: Session, asset: Asset, date_n, timeframe=TIMEFRAME_DAILY):
    """Generate outcome chart for a specific date and timeframe"""
    # Validate timeframe
    if timeframe not in VALID_TIMEFRAMES:
        logger.error(f"Invalid timeframe: {timeframe}")
        timeframe = TIMEFRAME_DAILY  # Default to daily
    
    # Get number of candles to display
    num_candles = CHART_CANDLES.get(timeframe, 30)
    
    # Create directory for asset type
    asset_type = asset.type  # "crypto" or "equity"
    os.makedirs(f"{settings.CHARTS_DIR}/{asset_type}", exist_ok=True)
    
    # Generate chart file name with timeframe included
    outcome_path = f"{asset_type}/{asset.symbol}_{date_n.strftime('%Y-%m-%d')}_{timeframe}_outcome.png"
    
    # Full path
    full_outcome_path = f"{settings.CHARTS_DIR}/{outcome_path}"
    
    # Check if chart already exists
    if os.path.exists(full_outcome_path):
        logger.info(f"Outcome chart already exists for {asset.symbol} - {date_n} ({timeframe})")
        return outcome_path
    
    logger.info(f"Generating outcome chart for {asset.symbol} - {date_n} ({timeframe})")
    
    # Get price data before and including date_n
    outcome_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date <= date_n,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date.desc()).limit(num_candles).all()
    
    if not outcome_data or len(outcome_data) < 2:
        logger.error(f"Insufficient outcome data for {asset.symbol} on/before {date_n} ({timeframe})")
        return None
    
    # Convert to pandas DataFrame
    outcome_df = pd.DataFrame([
    {
        "Date": data.date,
        "Open": data.open,
        "High": data.high,
        "Low": data.low,
        "Close": data.close,
        "Volume": 0.0 if data.volume is None else float(data.volume)
    } for data in reversed(outcome_data)
    ])
    
    outcome_df["Date"] = pd.to_datetime(outcome_df["Date"])
    outcome_df.set_index("Date", inplace=True)
    
    try:
        # Generate and save chart
        mpf.plot(outcome_df, type="candle", style="charles", figscale=1.5, 
                title=f"{asset.symbol} - {timeframe.upper()} Chart", 
                savefig=dict(fname=full_outcome_path, dpi=300))
        
        logger.info(f"Generated outcome chart for {asset.symbol} - {date_n} ({timeframe})")
        return outcome_path
    except Exception as e:
        logger.error(f"Error generating outcome chart for {asset.symbol} - {date_n} ({timeframe}): {str(e)}")
        return None

# Commenting out the chart generation function as we're moving to client-side rendering
# async def generate_charts(db: Session, asset: Asset, date_n, timeframe=TIMEFRAME_DAILY):
#     """Generate setup and outcome charts for a specific date and timeframe"""
#     # Function code commented out as we're moving to client-side rendering
#     pass

async def get_ohlc_data(db: Session, asset: Asset, date_n, timeframe=TIMEFRAME_DAILY):
    """Get OHLC data for a specific date and timeframe without generating charts"""
    # Validate timeframe
    if timeframe not in VALID_TIMEFRAMES:
        logger.error(f"Invalid timeframe: {timeframe}")
        timeframe = TIMEFRAME_DAILY  # Default to daily
    
    # Get number of candles to display
    num_candles = CHART_CANDLES.get(timeframe, 30)
    logger.info(f"Getting OHLC data for {asset.symbol} - {date_n} ({timeframe}) with {num_candles} candles")
    
    # Get setup period data (data before and including date_n)
    setup_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date <= date_n,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date.desc()).limit(num_candles).all()
    
    if not setup_data:
        logger.error(f"No setup data found for {asset.symbol} on/before {date_n} ({timeframe})")
        return None, None
    
    # Convert to list of dictionaries for JSON serialization
    setup_ohlc = [
        {
            "date": data.date.isoformat(),
            "open": data.open,
            "high": data.high,
            "low": data.low,
            "close": data.close,
            "volume": 0.0 if data.volume is None else float(data.volume)
        } for data in reversed(setup_data)  # Reverse to get chronological order
    ]
    
    # Get next day data for outcome
    next_day = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date > date_n,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date).first()
    
    outcome_ohlc = None
    if next_day:
        # Get outcome data (including days after date_n)
        outcome_data = db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.date <= next_day.date,
            PriceData.timeframe == timeframe
        ).order_by(PriceData.date.desc()).limit(num_candles).all()
        
        if outcome_data:
            outcome_ohlc = [
                {
                    "date": data.date.isoformat(),
                    "open": data.open,
                    "high": data.high,
                    "low": data.low,
                    "close": data.close,
                    "volume": 0.0 if data.volume is None else float(data.volume)
                } for data in reversed(outcome_data)  # Reverse to get chronological order
            ]
    
    return setup_ohlc, outcome_ohlc

async def prepare_test_data(db: Session, asset: Asset, timeframe=TIMEFRAME_DAILY, days=365, num_tests=5):
    """Prepare test data for an asset with specific timeframe"""
    # Validate timeframe
    if timeframe not in VALID_TIMEFRAMES:
        logger.error(f"Invalid timeframe: {timeframe}")
        timeframe = TIMEFRAME_DAILY  # Default to daily
    
    # Get price data for asset with specified timeframe
    price_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date).all()
    
    if not price_data or len(price_data) < 2:
        price_count = len(price_data) if price_data else 0
        logger.error(f"Insufficient price data for {asset.symbol} ({timeframe}): found {price_count} records, need at least 2")
        return []
    
    # Get dates that we can use for testing (excluding the last date)
    dates = [data.date for data in price_data[:-1]]
    
    # Pick random dates
    test_dates = random.sample(dates, min(num_tests, len(dates)))
    test_dates.sort()
    
    logger.info(f"Selected {len(test_dates)} test dates for {asset.symbol} ({timeframe})")
    
    # Generate charts and create test data
    tests = []
    for date_n in test_dates:
        # Use get_ohlc_data instead of generate_charts
        setup_ohlc_data, outcome_ohlc_data = await get_ohlc_data(db, asset, date_n, timeframe)
        
        if not setup_ohlc_data or not outcome_ohlc_data:
            continue
        
        # Determine sentiment based on the first candle of outcome data compared to the last candle of setup data
        last_setup_candle = setup_ohlc_data[-1]
        first_outcome_candle = outcome_ohlc_data[0]
        
        # If the close price of the outcome candle is higher than the close price of the setup candle, it's bullish
        if first_outcome_candle["close"] > last_setup_candle["close"]:
            sentiment = "Bullish"
        else:
            sentiment = "Bearish"
        
        # Get OHLC data for the date
        ohlc = db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.date == date_n,
            PriceData.timeframe == timeframe
        ).first()
        
        # Check if test data already exists
        existing_test = db.query(TestData).filter(
            TestData.asset_id == asset.id,
            TestData.date == date_n,
            TestData.timeframe == timeframe
        ).first()
        
        if existing_test:
            # Update existing test
            existing_test.correct_bias = sentiment
            tests.append(existing_test)
        else:
            # Create test data record without chart paths
            test_data = TestData(
                asset_id=asset.id,
                date=date_n,
                timeframe=timeframe,
                correct_bias=sentiment
            )
            db.add(test_data)
            tests.append(test_data)
    
    db.commit()
    logger.info(f"Prepared {len(tests)} tests for {asset.symbol} ({timeframe})")
    
    return tests

async def prepare_test_data_for_all_timeframes(db: Session, asset: Asset, num_tests_per_timeframe=5):
    """Prepare test data for all timeframes for an asset"""
    logger.info(f"Preparing test data for {asset.symbol} across all timeframes")
    
    all_tests = []
    successful_timeframes = []
    failed_timeframes = []
    
    # Process timeframes in a specific order (daily first, as it's most reliable)
    timeframe_order = [TIMEFRAME_DAILY, TIMEFRAME_4H, TIMEFRAME_WEEKLY, TIMEFRAME_MONTHLY]
    
    for timeframe in timeframe_order:
        try:
            logger.info(f"Generating {num_tests_per_timeframe} tests for {asset.symbol} in {timeframe} timeframe")
            tests = await prepare_test_data(db, asset, timeframe=timeframe, num_tests=num_tests_per_timeframe)
            
            if tests:
                all_tests.extend(tests)
                successful_timeframes.append(timeframe)
                logger.info(f"Successfully created {len(tests)} tests for {asset.symbol} in {timeframe} timeframe")
            else:
                failed_timeframes.append(timeframe)
                logger.warning(f"Failed to create tests for {asset.symbol} in {timeframe} timeframe")
        except Exception as e:
            failed_timeframes.append(timeframe)
            logger.error(f"Error preparing test data for {asset.symbol} in {timeframe} timeframe: {str(e)}")
    
    if successful_timeframes:
        logger.info(f"Successfully created tests for {asset.symbol} in timeframes: {', '.join(successful_timeframes)}")
    
    if failed_timeframes:
        logger.warning(f"Failed to create tests for {asset.symbol} in timeframes: {', '.join(failed_timeframes)}")
    
    return all_tests