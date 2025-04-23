import asyncio
import logging
import uuid
import random
from datetime import datetime, timedelta

import pandas as pd
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models import base
from app.models.asset import Asset
from app.models.test_data import TestData
from app.services.data_service import fetch_coingecko_data, fetch_alpha_vantage_data, fetch_data_for_all_timeframes, VALID_TIMEFRAMES

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initial asset data
CRYPTO_ASSETS = [
    {"symbol": "btc", "name": "Bitcoin", "api_id": "bitcoin", "type": "crypto"},
    {"symbol": "eth", "name": "Ethereum", "api_id": "ethereum", "type": "crypto"},
    {"symbol": "sol", "name": "Solana", "api_id": "solana", "type": "crypto"},
    {"symbol": "bnb", "name": "Binance Coin", "api_id": "binancecoin", "type": "crypto"}
]

EQUITY_ASSETS = [
    {"symbol": "nvda", "name": "Nvidia", "api_id": "NVDA", "type": "equity"},
    {"symbol": "aapl", "name": "Apple", "api_id": "AAPL", "type": "equity"},
    {"symbol": "tsla", "name": "Tesla", "api_id": "TSLA", "type": "equity"},
    {"symbol": "gld", "name": "Gold", "api_id": "GLD", "type": "equity"}
]

async def prepare_test_data_placeholders(db: Session, asset: Asset, timeframe=VALID_TIMEFRAMES[0], num_tests=5):
    """Create test data placeholders that will generate charts on demand"""
    logger.info(f"Preparing test data placeholders for {asset.symbol} - {timeframe}")
    
    # Get price data for asset with specified timeframe
    from app.models.price_data import PriceData
    price_data = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date).all()
    
    if not price_data or len(price_data) < 2:
        price_count = len(price_data) if price_data else 0
        logger.warning(f"Insufficient price data for {asset.symbol} ({timeframe}): found {price_count} records, need at least 2")
        return []
    
    # Get dates that we can use for testing (excluding the last date)
    dates = [data.date for data in price_data[:-1]]
    
    # Pick random dates
    test_dates = random.sample(dates, min(num_tests, len(dates)))
    test_dates.sort()
    
    logger.info(f"Selected {len(test_dates)} test dates for {asset.symbol} ({timeframe})")
    
    # Create placeholder test data
    tests = []
    for date_n in test_dates:
        # Get the next day data
        next_date_index = dates.index(date_n) + 1 if date_n in dates and dates.index(date_n) < len(dates) - 1 else None
        
        outcome_date = dates[next_date_index] if next_date_index is not None else date_n + timedelta(days=1)
        
        # Format chart paths but don't generate yet
        setup_path = f"{asset.type}/{asset.symbol}_{date_n.strftime('%Y-%m-%d')}_{timeframe}_setup.png"
        outcome_path = f"{asset.type}/{asset.symbol}_{outcome_date.strftime('%Y-%m-%d')}_{timeframe}_outcome.png"
        
        # Get OHLC data for the date
        ohlc = db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.date == date_n,
            PriceData.timeframe == timeframe
        ).first()
        
        next_ohlc = db.query(PriceData).filter(
            PriceData.asset_id == asset.id, 
            PriceData.date > date_n,
            PriceData.timeframe == timeframe
        ).order_by(PriceData.date).first()
        
        # Determine bias based on next candle
        if next_ohlc and ohlc:
            sentiment = "Bullish" if next_ohlc.close > ohlc.close else "Bearish"
        else:
            # Default to random if we don't have next data
            sentiment = random.choice(["Bullish", "Bearish"])
        
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
                correct_bias=sentiment,
                outcome_date=outcome_date if next_ohlc else None
            )
            db.add(test_data)
            tests.append(test_data)
    
    db.commit()
    logger.info(f"Created {len(tests)} test placeholders for {asset.symbol} ({timeframe})")
    
    return tests

async def initialize_db():
    """Initialize database with seed data and create test data"""
    try:
        # Create tables
        base.Base.metadata.create_all(bind=engine)
        logger.info("Created database tables")
        
        # Get database session
        db = next(get_db())
        
        # Add crypto assets
        for asset_data in CRYPTO_ASSETS:
            asset = db.query(Asset).filter(Asset.symbol == asset_data["symbol"]).first()
            if not asset:
                asset = Asset(**asset_data)
                db.add(asset)
                logger.info(f"Added crypto asset: {asset_data['name']}")
            else:
                logger.info(f"Crypto asset already exists: {asset_data['name']}")
        
        # Add equity assets
        for asset_data in EQUITY_ASSETS:
            asset = db.query(Asset).filter(Asset.symbol == asset_data["symbol"]).first()
            if not asset:
                asset = Asset(**asset_data)
                db.add(asset)
                logger.info(f"Added equity asset: {asset_data['name']}")
            else:
                logger.info(f"Equity asset already exists: {asset_data['name']}")
                
        # Commit changes
        db.commit()
        
        # Fetch data for all assets
        assets = db.query(Asset).all()
        logger.info(f"Fetching data for {len(assets)} assets")
        
        for asset in assets:
            try:
                # Fetch data for all timeframes
                timeframe_data = await fetch_data_for_all_timeframes(asset, db=db)
                if timeframe_data:
                    timeframes = list(timeframe_data.keys())
                    logger.info(f"Fetched data for {asset.symbol} with timeframes: {', '.join(timeframes)}")
                    
                    # Create test data placeholders
                    for timeframe in timeframes:
                        await prepare_test_data_placeholders(db, asset, timeframe=timeframe, num_tests=5)
                else:
                    logger.warning(f"No data fetched for {asset.symbol}")
            except Exception as e:
                logger.error(f"Error fetching data for {asset.symbol}: {str(e)}")
        
        logger.info("Database initialization complete")
        
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(initialize_db())