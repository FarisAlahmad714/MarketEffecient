import requests
import pandas as pd
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timedelta
import redis
import json
import asyncio

from app.models.asset import Asset
from app.models.price_data import PriceData
from app.config import settings

# Setup logging
logger = logging.getLogger(__name__)

# Setup Redis connection
redis_client = redis.from_url(settings.REDIS_URL)
CACHE_EXPIRY = 60 * 60 * 24  # 24 hours

# Define timeframe constants
TIMEFRAME_4H = "4h"
TIMEFRAME_DAILY = "daily"
TIMEFRAME_WEEKLY = "weekly"
TIMEFRAME_MONTHLY = "monthly"
VALID_TIMEFRAMES = [TIMEFRAME_4H, TIMEFRAME_DAILY, TIMEFRAME_WEEKLY, TIMEFRAME_MONTHLY]

async def fetch_coingecko_data(asset: Asset, timeframe=TIMEFRAME_DAILY, days=365, db: Session = None):
    """Fetch cryptocurrency data from CoinGecko for different timeframes"""
    # Validate timeframe
    if timeframe not in VALID_TIMEFRAMES:
        logger.error(f"Invalid timeframe: {timeframe}")
        timeframe = TIMEFRAME_DAILY  # Default to daily
    
    # For all timeframes, we need to fetch daily data first and then resample
    # Only the cache key will be timeframe-specific
    cache_key = f"crypto:{asset.api_id}:data:{timeframe}:{days}"
    
    # Check Redis cache first
    cached_data = redis_client.get(cache_key)
    if cached_data:
        logger.info(f"Using cached data for {asset.symbol} ({timeframe}) from Redis")
        # Parse the JSON string from Redis
        json_data = json.loads(cached_data)
        data = pd.DataFrame(json_data)
        data["Date"] = pd.to_datetime(data["Date"])
        data.set_index("Date", inplace=True)
        return data
    
    # Not in cache, fetch from API - Always fetch daily data
    url = f"{settings.COINGECKO_BASE_URL}/coins/{asset.api_id}/market_chart"
    
    # For non-daily timeframes, we need more data to ensure enough points after resampling
    fetch_days = days
    interval = "daily"
    if timeframe == TIMEFRAME_4H:
        fetch_days = min(90, days)  # CoinGecko limits hourly data to 90 days
        interval = "hourly"  # For 4h, we need hourly data to resample
    elif timeframe == TIMEFRAME_WEEKLY:
        fetch_days = max(days, 730)  # At least 2 years for weekly
    elif timeframe == TIMEFRAME_MONTHLY:
        fetch_days = max(days, 1825)  # At least 5 years for monthly
        
    params = {
        "vs_currency": "usd",
        "days": fetch_days,
        "interval": interval
    }
    
    # Add API key if available
    headers = {}
    if settings.COINGECKO_API_KEY:
        # Use Pro API key if available
        pro_url = f"https://pro-api.coingecko.com/api/v3/coins/{asset.api_id}/market_chart"
        headers["x-cg-pro-api-key"] = settings.COINGECKO_API_KEY
        url = pro_url
        logger.info(f"Using CoinGecko Pro API Key for {asset.symbol}")
    
    try:
        logger.info(f"Fetching {asset.symbol} data from CoinGecko API ({url}) for {timeframe} timeframe (using {params['interval']} data over {fetch_days} days)")
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        # Process the data
        prices = response.json()["prices"]
        logger.info(f"Received {len(prices)} raw price points for {asset.symbol}")
        
        data = pd.DataFrame(prices, columns=["Date", "Close"])
        data["Date"] = pd.to_datetime(data["Date"], unit="ms")
        data.set_index("Date", inplace=True)
        
        # Resample to appropriate timeframe
        original_rows = len(data)
        
        if timeframe == TIMEFRAME_4H:
            # For 4H, resample hourly data to 4-hour intervals
            data = data.resample('4H').agg({
                'Close': 'last'
            }).dropna()
            logger.info(f"Resampled {asset.symbol} data from {original_rows} hourly points to {len(data)} 4H candles")
        elif timeframe == TIMEFRAME_WEEKLY:
            # For weekly, resample daily data to weekly intervals
            data = data.resample('W').agg({
                'Close': 'last'
            }).dropna()
            logger.info(f"Resampled {asset.symbol} data from {original_rows} daily points to {len(data)} weekly candles")
        elif timeframe == TIMEFRAME_MONTHLY:
            # For monthly, resample daily data to monthly intervals
            data = data.resample('M').agg({
                'Close': 'last'
            }).dropna()
            logger.info(f"Resampled {asset.symbol} data from {original_rows} daily points to {len(data)} monthly candles")
        
        # Calculate OHLC values - need to calculate even for daily data
        data["Open"] = data["Close"].shift(1)
        data["High"] = data["Close"] * 1.02  # Simulate High
        data["Low"] = data["Close"] * 0.98   # Simulate Low
        data = data.dropna()
        
        logger.info(f"Final dataset for {asset.symbol} ({timeframe}): {len(data)} candles")
        
        if len(data) < 30:
            logger.warning(f"Not enough data points for {asset.symbol} ({timeframe}): only {len(data)} candles")
            if len(data) < 2:
                logger.error(f"Critically low data points for {asset.symbol} ({timeframe}): only {len(data)} candles - skipping")
                return None
        
        # Cache in Redis
        redis_client.setex(
            cache_key,
            CACHE_EXPIRY,
            data.reset_index().to_json(orient="records")
        )
        
        # Store in database if session provided
        if db:
            await store_price_data(db, asset, data, timeframe)
        
        return data
    
    except requests.RequestException as e:
        if isinstance(e, requests.exceptions.HTTPError):
            if e.response.status_code == 401:
                logger.error(f"CoinGecko API returned 401 Unauthorized for {asset.symbol} ({timeframe}). A Pro API key (COINGECKO_API_KEY) might be required for this data.")
            elif e.response.status_code == 429:
                logger.error(f"CoinGecko API rate limit exceeded for {asset.symbol} ({timeframe}). Try again later or add delays.")
            else:
                logger.error(f"HTTP error fetching {asset.symbol} ({timeframe}) data from CoinGecko: {str(e)}")
        else:
            logger.error(f"Error fetching {asset.symbol} ({timeframe}) data from CoinGecko: {str(e)}")
        return None # Return None if fetching fails

async def fetch_alpha_vantage_data(asset: Asset, timeframe=TIMEFRAME_DAILY, days=365, db: Session = None):
    """Fetch equity data from Alpha Vantage for different timeframes"""
    # Validate timeframe
    if timeframe not in VALID_TIMEFRAMES:
        logger.error(f"Invalid timeframe: {timeframe}")
        timeframe = TIMEFRAME_DAILY  # Default to daily
        
    cache_key = f"equity:{asset.symbol}:data:{timeframe}:{days}"
    
    # Check Redis cache first
    cached_data = redis_client.get(cache_key)
    if cached_data:
        logger.info(f"Using cached data for {asset.symbol} ({timeframe}) from Redis")
        try:
            # Parse the JSON string from Redis
            json_data = json.loads(cached_data)
            if not json_data or not isinstance(json_data, list):
                logger.warning(f"Invalid or empty cache data found for {asset.symbol} ({timeframe}). Fetching from API.")
                redis_client.delete(cache_key) # Clear bad cache
            else:
                data = pd.DataFrame(json_data)
                # Check if 'Date' column exists before accessing it
                if "Date" not in data.columns:
                    logger.error(f"Cached data for {asset.symbol} ({timeframe}) is missing 'Date' column. Keys: {list(data.columns)}. Fetching from API.")
                    redis_client.delete(cache_key) # Clear bad cache
                else:
                    data["Date"] = pd.to_datetime(data["Date"])
                    data.set_index("Date", inplace=True)
                    if data.empty:
                        logger.warning(f"Empty DataFrame after processing cache for {asset.symbol} ({timeframe}). Fetching from API.")
                        redis_client.delete(cache_key) # Clear bad cache
                    else:
                        logger.info(f"Successfully loaded {len(data)} points for {asset.symbol} ({timeframe}) from cache.")
                        return data
        except (json.JSONDecodeError, TypeError, KeyError, ValueError) as e:
            logger.error(f"Error processing cached data for {asset.symbol} ({timeframe}): {e}. Fetching from API instead.")
            # Clear potentially corrupted cache entry
            redis_client.delete(cache_key)
        # If cache processing failed or cache was empty/invalid, proceed to fetch from API
    
    # Choose appropriate Alpha Vantage function based on timeframe
    function = "TIME_SERIES_DAILY"
    interval = None  # Initialize interval variable
    
    if timeframe == TIMEFRAME_4H:
        # For 4h timeframe, we'll get 60min data and then resample
        function = "TIME_SERIES_INTRADAY"
        interval = "60min"
        outputsize = "full"  # Get as much data as possible
    elif timeframe == TIMEFRAME_WEEKLY:
        function = "TIME_SERIES_WEEKLY"
        outputsize = "full"
    elif timeframe == TIMEFRAME_MONTHLY:
        function = "TIME_SERIES_MONTHLY"
        outputsize = "full"
    else:  # TIMEFRAME_DAILY
        outputsize = "full"
    
    # Not in cache, fetch from API
    url = f"{settings.ALPHA_VANTAGE_BASE_URL}"
    params = {
        "function": function,
        "symbol": asset.symbol.upper(),
        "outputsize": outputsize,
        "apikey": settings.ALPHA_VANTAGE_API_KEY
    }
    
    # Add interval parameter for intraday data
    if timeframe == TIMEFRAME_4H and interval:
        params["interval"] = interval
    
    try:
        logger.info(f"Fetching {asset.symbol} {timeframe} data from Alpha Vantage API with function={function}")
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        # Process the data
        json_data = response.json()
        
        # Log response keys to help diagnose issues
        logger.info(f"Alpha Vantage response keys for {asset.symbol} ({timeframe}): {list(json_data.keys())}")
        
        # Get the appropriate time series key based on timeframe
        time_series_key = None
        if timeframe == TIMEFRAME_4H and interval:
            time_series_key = f"Time Series ({interval})"
        elif timeframe == TIMEFRAME_DAILY:
            time_series_key = "Time Series (Daily)"
        elif timeframe == TIMEFRAME_WEEKLY:
            time_series_key = "Weekly Time Series"
        elif timeframe == TIMEFRAME_MONTHLY:
            time_series_key = "Monthly Time Series"
        
        if time_series_key is None or time_series_key not in json_data:
            # Try to provide more helpful error information
            error_msg = json_data.get("Error Message", "Unknown error")
            note_msg = json_data.get("Note", "")
            logger.error(f"Error in Alpha Vantage response for {asset.symbol} ({timeframe}): {error_msg}")
            if note_msg:
                logger.error(f"API Note: {note_msg}")
            logger.error(f"Available keys: {list(json_data.keys())}")
            return None
        
        time_series = json_data[time_series_key]
        logger.info(f"Received {len(time_series)} data points for {asset.symbol} ({timeframe})")
        
        # Convert to DataFrame
        data = pd.DataFrame.from_dict(time_series, orient="index")
        
        # Rename columns consistently
        if "1. open" in data.columns:
            data = data.rename(columns={
                "1. open": "Open",
                "2. high": "High",
                "3. low": "Low",
                "4. close": "Close",
                "5. volume": "Volume"
            })
        
        # Convert to datetime and numeric
        data.index = pd.to_datetime(data.index)
        data = data.astype(float)
        data = data.sort_index()
        
        original_rows = len(data)
        
        # For 4-hour data, resample from hourly
        if timeframe == TIMEFRAME_4H:
            # First, make sure the data is sorted by ascending date
            data = data.sort_index()
            
            # Resample to 4-hour periods
            data = data.resample('4H').agg({
                'Open': 'first',
                'High': 'max',
                'Low': 'min',
                'Close': 'last',
                'Volume': 'sum'
            }).dropna()
            
            logger.info(f"Resampled {asset.symbol} data from {original_rows} hourly points to {len(data)} 4H candles")
        
        # Limit to the number of days requested
        if timeframe in [TIMEFRAME_DAILY, TIMEFRAME_4H]:
            data = data.tail(days)
        
        # Check if we have enough data
        if len(data) < 30:
            logger.warning(f"Not enough data points for {asset.symbol} ({timeframe}): only {len(data)} candles")
            if len(data) < 2:
                logger.error(f"Critically low data points for {asset.symbol} ({timeframe}): only {len(data)} candles - skipping")
                return None
        
        # Cache in Redis
        redis_client.setex(
            cache_key,
            CACHE_EXPIRY,
            data.reset_index().to_json(orient="records")
        )
        
        # Store in database if session provided
        if db:
            await store_price_data(db, asset, data, timeframe)
        
        return data
    
    except requests.RequestException as e:
        logger.error(f"Error fetching {asset.symbol} {timeframe} data from Alpha Vantage: {str(e)}")
        return None

async def store_price_data(db: Session, asset: Asset, data: pd.DataFrame, timeframe=TIMEFRAME_DAILY):
    """Store price data in the database with timeframe using bulk operations"""
    if data.empty:
        logger.warning(f"Empty DataFrame provided for {asset.symbol} ({timeframe}). Nothing to store.")
        return
    
    # Convert all dates to date objects for consistency
    date_list = [date.date() if hasattr(date, 'date') else date for date in data.index]
    
    # Fetch all existing records for this asset and timeframe in one query
    existing_records = {
        r.date: r for r in db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.timeframe == timeframe,
            PriceData.date.in_(date_list)
        ).all()
    }
    
    # Prepare bulk operations
    to_insert = []
    to_update = []
    
    # Process all records in one pass
    for date, row in data.iterrows():
        record_date = date.date() if hasattr(date, 'date') else date
        
        if record_date in existing_records:
            # Update existing record
            existing = existing_records[record_date]
            existing.open = row["Open"]
            existing.high = row["High"]
            existing.low = row["Low"]
            existing.close = row["Close"]
            existing.volume = row.get("Volume", None)
            to_update.append(existing)
        else:
            # Create new record
            to_insert.append({
                "asset_id": asset.id,
                "date": record_date,
                "timeframe": timeframe,
                "open": row["Open"],
                "high": row["High"],
                "low": row["Low"],
                "close": row["Close"],
                "volume": row.get("Volume", None)
            })
    
    # Execute operations in bulk
    if to_insert:
        db.execute(PriceData.__table__.insert(), to_insert)
        logger.info(f"Bulk inserted {len(to_insert)} price data points for {asset.symbol} ({timeframe})")
    
    # Commit once for all changes
    if to_insert or to_update:
        db.commit()
        total_changes = len(to_insert) + len(to_update)
        logger.info(f"Stored {total_changes} price data points for {asset.symbol} ({timeframe}): {len(to_insert)} inserts, {len(to_update)} updates")
    else:
        logger.info(f"No new price data points to insert or update for {asset.symbol} ({timeframe})")

async def get_sentiment(db: Session, asset: Asset, date, timeframe=TIMEFRAME_DAILY):
    """Determine bullish/bearish sentiment based on next day's price"""
    # Get the current day's closing price
    current_day = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date == date,
        PriceData.timeframe == timeframe
    ).first()
    
    if not current_day:
        logger.error(f"No price data found for {asset.symbol} on {date} ({timeframe})")
        return None
    
    # Get the next day's price
    next_day = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date > date,
        PriceData.timeframe == timeframe
    ).order_by(PriceData.date).first()
    
    if not next_day:
        logger.error(f"No next day price data found for {asset.symbol} after {date} ({timeframe})")
        return None
    
    # Determine sentiment
    if next_day.close > current_day.close:
        return "Bullish"
    else:
        return "Bearish"

async def fetch_data_for_all_timeframes(asset: Asset, db: Session = None):
    """Fetch data for all timeframes for an asset"""
    results = {}
    for timeframe in VALID_TIMEFRAMES:
        # Define cache key based on timeframe
        days_param = 365 # Base days, will be adjusted inside fetch functions
        if asset.type == "crypto":
            cache_key = f"crypto:{asset.api_id}:data:{timeframe}:{days_param}"
        else:
            cache_key = f"equity:{asset.symbol}:data:{timeframe}:{days_param}"
        
        # Check cache before potential sleep
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            # Try to load from cache directly here for efficiency
            try:
                logger.info(f"Using cached data for {asset.symbol} ({timeframe}) from Redis")
                json_data = json.loads(cached_data)
                if not json_data or not isinstance(json_data, list):
                     logger.warning(f"Invalid or empty cache data found for {asset.symbol} ({timeframe}). Will fetch from API.")
                else:
                    data = pd.DataFrame(json_data)
                    if "Date" not in data.columns:
                         logger.error(f"Cached data for {asset.symbol} ({timeframe}) is missing 'Date' column. Will fetch from API.")
                    else:
                        data["Date"] = pd.to_datetime(data["Date"])
                        data.set_index("Date", inplace=True)
                        if not data.empty:
                             logger.info(f"Successfully loaded {len(data)} points for {asset.symbol} ({timeframe}) from cache.")
                             results[timeframe] = data
                             continue # Skip API call if cache is good
            except Exception as e:
                logger.error(f"Error processing cached data for {asset.symbol} ({timeframe}): {e}. Will fetch from API.")
                redis_client.delete(cache_key)
        
        # If not cached or cache failed, fetch from API with delay
        logger.info(f"No valid cache for {asset.symbol} ({timeframe}). Fetching from API...")
        await asyncio.sleep(2) # Add a 2-second delay before API calls to avoid rate limits
        
        try:
            logger.info(f"Fetching {timeframe} data for {asset.symbol}")
            if asset.type == "crypto":
                data = await fetch_coingecko_data(asset, timeframe=timeframe, db=db)
            else:
                data = await fetch_alpha_vantage_data(asset, timeframe=timeframe, db=db)
            
            if data is not None and not data.empty:
                logger.info(f"Successfully fetched {len(data)} {timeframe} data points for {asset.symbol}")
                results[timeframe] = data
            else:
                logger.warning(f"No {timeframe} data returned for {asset.symbol} from API")
        except Exception as e:
            logger.error(f"Error fetching {timeframe} data for {asset.symbol}: {str(e)}")
    
    if not results:
        logger.error(f"Failed to fetch data for {asset.symbol} for any timeframe")
    else:
        logger.info(f"Successfully fetched data for {asset.symbol} in timeframes: {list(results.keys())}")
    
    return results