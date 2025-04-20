import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import mplfinance as mpf
import pandas as pd
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session
import random

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

async def generate_charts(db: Session, asset: Asset, date_n, timeframe=TIMEFRAME_DAILY):
    """Generate setup and outcome charts for a specific date and timeframe"""
    # Validate timeframe
    if timeframe not in VALID_TIMEFRAMES:
        logger.error(f"Invalid timeframe: {timeframe}")
        timeframe = TIMEFRAME_DAILY  # Default to daily
    
    # Get number of candles to display
    num_candles = CHART_CANDLES.get(timeframe, 30)
    logger.info(f"Generating {asset.symbol} charts for {date_n} ({timeframe}) with {num_candles} candles")
    
    # Get price data before and including date_n
    setup_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date <= date_n,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date.desc()).limit(num_candles).all()
    
    if not setup_data:
        logger.error(f"No setup data found for {asset.symbol} on/before {date_n} ({timeframe})")
        return None, None, None
    
    logger.info(f"Found {len(setup_data)} setup data points for {asset.symbol} on/before {date_n} ({timeframe})")
    
    # Convert to pandas DataFrame
    setup_df = pd.DataFrame([
    {
        "Date": data.date,
        "Open": data.open,
        "High": data.high,
        "Low": data.low,
        "Close": data.close,
        "Volume": 0.0 if data.volume is None else float(data.volume)  # Convert None to 0.0
    } for data in reversed(setup_data)
    ])
    
    if len(setup_df) < 2:
        logger.error(f"Insufficient setup data for {asset.symbol} on/before {date_n} ({timeframe}): only {len(setup_df)} candles")
        return None, None, None
    
    setup_df["Date"] = pd.to_datetime(setup_df["Date"])
    setup_df.set_index("Date", inplace=True)
    
    # Get next day data
    next_day = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date > date_n,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date).first()
    
    if not next_day:
        logger.error(f"No next day data found for {asset.symbol} after {date_n} ({timeframe})")
        return None, None, None
    
    logger.info(f"Found next period data for {asset.symbol} on {next_day.date} ({timeframe})")
    
    # Get data for outcome chart (including next day)
    outcome_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date <= next_day.date,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date.desc()).limit(num_candles).all()
    
    if not outcome_data:
        logger.error(f"No outcome data found for {asset.symbol} on/before {next_day.date} ({timeframe})")
        return None, None, None
    
    logger.info(f"Found {len(outcome_data)} outcome data points for {asset.symbol} on/before {next_day.date} ({timeframe})")
    
    # Convert to pandas DataFrame
    outcome_df = pd.DataFrame([
    {
        "Date": data.date,
        "Open": data.open,
        "High": data.high,
        "Low": data.low,
        "Close": data.close,
        "Volume": 0.0 if data.volume is None else float(data.volume)  # Convert None to 0.0
    } for data in reversed(outcome_data)
    ])
    
    if len(outcome_df) < 2:
        logger.error(f"Insufficient outcome data for {asset.symbol} on/before {next_day.date} ({timeframe}): only {len(outcome_df)} candles")
        return None, None, None
    
    outcome_df["Date"] = pd.to_datetime(outcome_df["Date"])
    outcome_df.set_index("Date", inplace=True)
    
    # Create directory for asset type
    asset_type = asset.type  # "crypto" or "equity"
    os.makedirs(f"{settings.CHARTS_DIR}/{asset_type}", exist_ok=True)
    
    # Generate chart file names with timeframe included
    setup_path = f"{asset_type}/{asset.symbol}_{date_n.strftime('%Y-%m-%d')}_{timeframe}_setup.png"
    outcome_path = f"{asset_type}/{asset.symbol}_{next_day.date.strftime('%Y-%m-%d')}_{timeframe}_outcome.png"
    
    # Full paths
    full_setup_path = f"{settings.CHARTS_DIR}/{setup_path}"
    full_outcome_path = f"{settings.CHARTS_DIR}/{outcome_path}"
    
    # Check if charts already exist to avoid regenerating
    if not os.path.exists(full_setup_path) or not os.path.exists(full_outcome_path):
        try:
            # Generate and save charts - use dict format for savefig
            mpf.plot(setup_df, type="candle", style="charles", figscale=1.5, 
                    title=f"{asset.symbol} - {timeframe.upper()} Chart", 
                    savefig=dict(fname=full_setup_path, dpi=300))
            
            mpf.plot(outcome_df, type="candle", style="charles", figscale=1.5, 
                    title=f"{asset.symbol} - {timeframe.upper()} Chart", 
                    savefig=dict(fname=full_outcome_path, dpi=300))
            
            logger.info(f"Generated charts for {asset.symbol} - {date_n} ({timeframe})")
        except Exception as e:
            logger.error(f"Error generating charts for {asset.symbol} - {date_n} ({timeframe}): {str(e)}")
            return None, None, None
    else:
        logger.info(f"Charts already exist for {asset.symbol} - {date_n} ({timeframe})")
    
    # Determine sentiment
    if next_day.close > setup_df.iloc[-1]["Close"]:
        sentiment = "Bullish"
    else:
        sentiment = "Bearish"
    
    return setup_path, outcome_path, sentiment

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
        setup_path, outcome_path, sentiment = await generate_charts(db, asset, date_n, timeframe)
        
        if not setup_path or not outcome_path:
            continue
        
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
            existing_test.setup_chart_path = setup_path
            existing_test.outcome_chart_path = outcome_path
            existing_test.correct_bias = sentiment
            tests.append(existing_test)
        else:
            # Create test data record
            test_data = TestData(
                asset_id=asset.id,
                date=date_n,
                timeframe=timeframe,
                setup_chart_path=setup_path,
                outcome_chart_path=outcome_path,
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