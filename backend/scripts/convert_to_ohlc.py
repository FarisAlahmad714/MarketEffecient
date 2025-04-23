#!/usr/bin/env python3
"""
Script to convert existing tests to use OHLC data instead of static chart images.
This sets chart paths to NULL for all test data, which will force the API to use
the OHLC data approach.
"""

import os
import sys
import asyncio
from sqlalchemy import update

# Add the parent directory to the path so we can import from the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.test_data import TestData

async def main():
    """Main function to update test data"""
    print("Converting all tests to use OHLC data...")
    
    # Create a database session
    db = SessionLocal()
    
    try:
        # Count total tests
        total_tests = db.query(TestData).count()
        print(f"Found {total_tests} tests to update")
        
        # Update all tests to set chart paths to NULL
        stmt = update(TestData).values(
            setup_chart_path=None,
            outcome_chart_path=None
        )
        
        result = db.execute(stmt)
        db.commit()
        
        print(f"Updated {result.rowcount} tests to use OHLC data")
        
    except Exception as e:
        print(f"Error updating tests: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main()) 