import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import mplfinance as mpf
import pandas as pd
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.price_data import PriceData
from app.models.test_data import TestData
from app.config import settings

# Setup logging
logger = logging.getLogger(__name__)

async def generate_charts(db: Session, asset: Asset, date_n):
    """Generate setup and outcome charts for a specific date"""
    # Get price data before and including date_n (30 days)
    setup_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date <= date_n
    ).order_by(PriceData.date.desc()).limit(30).all()
    
    # Convert to pandas DataFrame
    setup_df = pd.DataFrame([
        {
            "Date": data.date,
            "Open": data.open,
            "High": data.high,
            "Low": data.low,
            "Close": data.close,
            "Volume": data.volume
        } for data in reversed(setup_data)
    ])
    setup_df["Date"] = pd.to_datetime(setup_df["Date"])
    setup_df.set_index("Date", inplace=True)
    
    # Get next day data
    next_day = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date > date_n
    ).order_by(PriceData.date).first()
    
    if not next_day:
        logger.error(f"No next day data found for {asset.symbol} after {date_n}")
        return None, None, None
    
    # Get data for outcome chart (including next day)
    outcome_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date <= next_day.date
    ).order_by(PriceData.date.desc()).limit(30).all()
    
    # Convert to pandas DataFrame
    outcome_df = pd.DataFrame([
        {
            "Date": data.date,
            "Open": data.open,
            "High": data.high,
            "Low": data.low,
            "Close": data.close,
            "Volume": data.volume
        } for data in reversed(outcome_data)
    ])
    outcome_df["Date"] = pd.to_datetime(outcome_df["Date"])
    outcome_df.set_index("Date", inplace=True)
    
    # Create directory for asset type
    asset_type = asset.type  # "crypto" or "equity"
    os.makedirs(f"{settings.CHARTS_DIR}/{asset_type}", exist_ok=True)
    
    # Generate chart file names
    setup_path = f"{asset_type}/{asset.symbol}_{date_n.strftime('%Y-%m-%d')}_setup.png"
    outcome_path = f"{asset_type}/{asset.symbol}_{next_day.date.strftime('%Y-%m-%d')}_outcome.png"
    
    # Full paths
    full_setup_path = f"{settings.CHARTS_DIR}/{setup_path}"
    full_outcome_path = f"{settings.CHARTS_DIR}/{outcome_path}"
    
    # Generate and save charts
    mpf.plot(setup_df, type="candle", style="charles", figscale=1.5, savefig=full_setup_path)
    mpf.plot(outcome_df, type="candle", style="charles", figscale=1.5, savefig=full_outcome_path)
    
    logger.info(f"Generated charts for {asset.symbol} - {date_n}")
    
    # Determine sentiment
    if next_day.close > setup_df.iloc[-1]["Close"]:
        sentiment = "Bullish"
    else:
        sentiment = "Bearish"
    
    return setup_path, outcome_path, sentiment

async def prepare_test_data(db: Session, asset: Asset, days=365, num_tests=5):
    """Prepare test data for an asset"""
    # Get price data for asset
    price_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id
    ).order_by(PriceData.date).all()
    
    if not price_data or len(price_data) < 2:
        logger.error(f"Insufficient price data for {asset.symbol}")
        return []
    
    # Get dates that we can use for testing (excluding the last date)
    dates = [data.date for data in price_data[:-1]]
    
    # Pick random dates
    import random
    test_dates = random.sample(dates, min(num_tests, len(dates)))
    test_dates.sort()
    
    logger.info(f"Selected {len(test_dates)} test dates for {asset.symbol}")
    
    # Generate charts and create test data
    tests = []
    for date_n in test_dates:
        setup_path, outcome_path, sentiment = await generate_charts(db, asset, date_n)
        
        if not setup_path or not outcome_path:
            continue
        
        # Get OHLC data for the date
        ohlc = db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.date == date_n
        ).first()
        
        # Create test data record
        test_data = TestData(
            asset_id=asset.id,
            date=date_n,
            setup_chart_path=setup_path,
            outcome_chart_path=outcome_path,
            correct_bias=sentiment
        )
        db.add(test_data)
        tests.append(test_data)
    
    db.commit()
    logger.info(f"Prepared {len(tests)} tests for {asset.symbol}")
    
    return tests