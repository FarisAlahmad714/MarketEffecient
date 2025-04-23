import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import Asset
from app.services.data_service import fetch_data_for_all_timeframes
from app.services.chart_service import prepare_test_data_for_all_timeframes

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def refresh_asset_data(db: Session, asset: Asset, force_refresh: bool = False):
    """Refresh price data for a single asset"""
    try:
        # Check if we need to refresh based on last update time
        current_time = datetime.utcnow()
        if not force_refresh and asset.last_updated:
            # If asset was updated in the last 4 hours, skip
            time_diff = (current_time - asset.last_updated).total_seconds() / 3600
            if time_diff < 4:
                logger.info(f"Skipping refresh for {asset.name} - updated {time_diff:.1f} hours ago")
                return False

        # Fetch price data for all timeframes
        logger.info(f"Refreshing data for {asset.name} ({asset.symbol})")
        timeframe_data = await fetch_data_for_all_timeframes(asset, db=db)
        
        if not timeframe_data:
            logger.error(f"Failed to fetch data for {asset.name}")
            return False
        
        # Update last_updated timestamp
        asset.last_updated = current_time
        db.commit()
        
        # Check which timeframes have data
        available_timeframes = list(timeframe_data.keys())
        logger.info(f"Refreshed data for {asset.name} with timeframes: {', '.join(available_timeframes)}")
        
        # Don't generate charts during data refresh - they'll be generated on demand
        # This is a key optimization to speed up startup and reduce memory usage
        
        # Wait a shorter time between API calls to avoid rate limiting
        await asyncio.sleep(2)
        return True
        
    except Exception as e:
        logger.error(f"Error refreshing data for {asset.name}: {str(e)}")
        return False

async def refresh_data():
    """Refresh data for all assets"""
    logger.info("Starting data refresh task...")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Get all active assets
        assets = db.query(Asset).filter(Asset.is_active == True).all()
        logger.info(f"Found {len(assets)} active assets to refresh")
        
        # Refresh data for each asset
        for asset in assets:
            try:
                await refresh_asset_data(db, asset)
            except Exception as e:
                logger.error(f"Error refreshing data for {asset.name}: {str(e)}")
        
        logger.info("Data refresh task completed")
    except Exception as e:
        logger.error(f"Error in data refresh task: {str(e)}")
    finally:
        # Close database session
        db.close()

if __name__ == "__main__":
    asyncio.run(refresh_data()) 