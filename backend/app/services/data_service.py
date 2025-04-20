import requests
import pandas as pd
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timedelta
import redis
import json

from app.models.asset import Asset
from app.models.price_data import PriceData
from app.config import settings

# Setup logging
logger = logging.getLogger(__name__)

# Setup Redis connection
redis_client = redis.from_url(settings.REDIS_URL)
CACHE_EXPIRY = 60 * 60 * 24  # 24 hours

async def fetch_coingecko_data(asset: Asset, days=365, db: Session = None):
    """Fetch cryptocurrency data from CoinGecko"""
    cache_key = f"crypto:{asset.api_id}:data:{days}"
    
    # Check Redis cache first
    cached_data = redis_client.get(cache_key)
    if cached_data:
        logger.info(f"Using cached data for {asset.symbol} from Redis")
        data = pd.read_json(cached_data)
        data.index = pd.to_datetime(data.index)
        return data
    
    # Not in cache, fetch from API
    url = f"{settings.COINGECKO_BASE_URL}/coins/{asset.api_id}/market_chart"
    params = {
        "vs_currency": "usd",
        "days": days,
        "interval": "daily"
    }
    
    try:
        logger.info(f"Fetching {asset.symbol} data from CoinGecko API")
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        # Process the data
        prices = response.json()["prices"]
        data = pd.DataFrame(prices, columns=["Date", "Close"])
        data["Date"] = pd.to_datetime(data["Date"], unit="ms")
        data.set_index("Date", inplace=True)
        data["Open"] = data["Close"].shift(1)
        data["High"] = data["Close"] * 1.02  # Simulate High (like original app)
        data["Low"] = data["Close"] * 0.98   # Simulate Low (like original app)
        data = data.dropna()
        
        # Cache in Redis
        redis_client.setex(
            cache_key,
            CACHE_EXPIRY,
            data.reset_index().to_json(orient="records")
        )
        
        # Store in database if session provided
        if db:
            await store_price_data(db, asset, data)
        
        return data
    
    except requests.RequestException as e:
        logger.error(f"Error fetching {asset.symbol} data from CoinGecko: {str(e)}")
        return None

async def fetch_alpha_vantage_data(asset: Asset, days=365, db: Session = None):
    """Fetch equity data from Alpha Vantage"""
    cache_key = f"equity:{asset.symbol}:data:{days}"
    
    # Check Redis cache first
    cached_data = redis_client.get(cache_key)
    if cached_data:
        logger.info(f"Using cached data for {asset.symbol} from Redis")
        data = pd.read_json(cached_data)
        data.index = pd.to_datetime(data.index)
        return data
    
    # Not in cache, fetch from API
    url = f"{settings.ALPHA_VANTAGE_BASE_URL}"
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": asset.symbol.upper(),
        "outputsize": "full",
        "apikey": settings.ALPHA_VANTAGE_API_KEY
    }
    
    try:
        logger.info(f"Fetching {asset.symbol} data from Alpha Vantage API")
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        # Process the data
        json_data = response.json()
        if "Time Series (Daily)" not in json_data:
            logger.error(f"Error in Alpha Vantage response for {asset.symbol}: {json_data.get('Error Message', 'Unknown error')}")
            return None
        
        time_series = json_data["Time Series (Daily)"]
        data = pd.DataFrame.from_dict(time_series, orient="index")
        data = data.rename(columns={
            "1. open": "Open",
            "2. high": "High",
            "3. low": "Low",
            "4. close": "Close",
            "5. volume": "Volume"
        })
        data.index = pd.to_datetime(data.index)
        data = data.astype(float)
        data = data.sort_index()
        data = data.tail(days)
        
        # Cache in Redis
        redis_client.setex(
            cache_key,
            CACHE_EXPIRY,
            data.reset_index().to_json(orient="records")
        )
        
        # Store in database if session provided
        if db:
            await store_price_data(db, asset, data)
        
        return data
    
    except requests.RequestException as e:
        logger.error(f"Error fetching {asset.symbol} data from Alpha Vantage: {str(e)}")
        return None

async def store_price_data(db: Session, asset: Asset, data: pd.DataFrame):
    """Store price data in the database"""
    for date, row in data.iterrows():
        # Check if data for this date already exists
        existing = db.query(PriceData).filter(
            PriceData.asset_id == asset.id,
            PriceData.date == date.date()
        ).first()
        
        if existing:
            # Update existing
            existing.open = row["Open"]
            existing.high = row["High"]
            existing.low = row["Low"]
            existing.close = row["Close"]
            existing.volume = row.get("Volume", None)
        else:
            # Create new
            price_data = PriceData(
                asset_id=asset.id,
                date=date.date(),
                open=row["Open"],
                high=row["High"],
                low=row["Low"],
                close=row["Close"],
                volume=row.get("Volume", None)
            )
            db.add(price_data)
    
    db.commit()
    logger.info(f"Stored {len(data)} price data points for {asset.symbol} in database")

async def get_sentiment(db: Session, asset: Asset, date):
    """Determine bullish/bearish sentiment based on next day's price"""
    # Get the current day's closing price
    current_day = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date == date
    ).first()
    
    if not current_day:
        logger.error(f"No price data found for {asset.symbol} on {date}")
        return None
    
    # Get the next day's price
    next_day = db.query(PriceData).filter(
        PriceData.asset_id == asset.id,
        PriceData.date > date
    ).order_by(PriceData.date).first()
    
    if not next_day:
        logger.error(f"No next day price data found for {asset.symbol} after {date}")
        return None
    
    # Determine sentiment
    if next_day.close > current_day.close:
        return "Bullish"
    else:
        return "Bearish"