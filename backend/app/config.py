import os
from dotenv import load_dotenv
from pydantic import BaseSettings

# Load environment variables
load_dotenv()

class Settings(BaseSettings):
    # API Keys
    ALPHA_VANTAGE_API_KEY: str = os.getenv("ALPHA_VANTAGE_API_KEY", "QRL7874F7OJAGJHY")  # Default from original app
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/tradingapp")
    
    # Redis cache settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    
    # Chart settings
    CHARTS_DIR: str = "app/static"
    
    # Test settings
    NUM_TESTS_PER_ASSET: int = 5
    
    # API settings
    COINGECKO_BASE_URL: str = "https://api.coingecko.com/api/v3"
    ALPHA_VANTAGE_BASE_URL: str = "https://www.alphavantage.co/query"

# Create settings instance
settings = Settings()