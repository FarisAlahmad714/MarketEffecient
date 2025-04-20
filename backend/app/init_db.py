import asyncio
import logging

import pandas as pd
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models import base
from app.models.asset import Asset
from app.services.data_service import fetch_coingecko_data, fetch_alpha_vantage_data, fetch_data_for_all_timeframes, VALID_TIMEFRAMES
from app.services.chart_service import prepare_test_data_for_all_timeframes

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

async def init_asset(db: Session, asset_data):
    """Initialize an asset with price data and tests"""
    # Check if asset already exists
    asset = db.query(Asset).filter(Asset.symbol == asset_data["symbol"]).first()
    
    if not asset:
        # Create asset
        asset = Asset(
            symbol=asset_data["symbol"],
            name=asset_data["name"],
            api_id=asset_data["api_id"],
            type=asset_data["type"],
            is_active=True
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        logger.info(f"Created asset: {asset.name} ({asset.symbol})")
    else:
        logger.info(f"Asset already exists: {asset.name} ({asset.symbol})")
    
    # Fetch price data for all timeframes
    # This will fetch data for all timeframes and store in the database
    timeframe_data = await fetch_data_for_all_timeframes(asset, db=db)
    
    if not timeframe_data:
        logger.error(f"Failed to fetch data for {asset.name}")
        return
    
    # Check which timeframes have data
    available_timeframes = list(timeframe_data.keys())
    logger.info(f"Fetched data for {asset.name} with timeframes: {', '.join(available_timeframes)}")
    
    # Prepare test data for all timeframes
    tests = await prepare_test_data_for_all_timeframes(db, asset, num_tests_per_timeframe=5)
    logger.info(f"Created {len(tests)} tests for {asset.name}")

async def init_db():
    """Initialize the database with assets, price data, and tests"""
    # Create tables
    base.Base.metadata.create_all(bind=engine)
    logger.info("Created database tables")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Initialize crypto assets
        for asset_data in CRYPTO_ASSETS:
            await init_asset(db, asset_data)
            logger.info("Sleeping for 5 seconds before next asset...")
            await asyncio.sleep(5)  # Longer delay between assets
        
        # Initialize equity assets
        for asset_data in EQUITY_ASSETS:
            await init_asset(db, asset_data)
            logger.info("Sleeping for 5 seconds before next asset...")
            await asyncio.sleep(5)  # Longer delay between assets
        
        logger.info("Database initialization complete")
    
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
    
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(init_db())