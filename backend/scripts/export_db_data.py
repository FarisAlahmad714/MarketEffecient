#!/usr/bin/env python
"""
Database data export script for creating seed files
Run this after your database has essential data to export it to SQL files
"""

import os
import asyncio
import subprocess
import logging
from datetime import datetime, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection variables
DB_USER = "postgres"
DB_PASSWORD = "postgres"
DB_NAME = "tradingapp"
DB_HOST = "localhost"
DB_PORT = "5432"

# Export directory
SEED_DIR = "../seed_data"
TIMESTAMP = datetime.now().strftime("%Y%m%d%H%M%S")

async def export_table(table_name, schema_only=False, where_clause=None):
    """Export a table to a SQL file"""
    filename = f"{SEED_DIR}/02_{table_name}_data.sql"
    
    # Options for pg_dump
    options = [
        f"--host={DB_HOST}",
        f"--port={DB_PORT}",
        f"--username={DB_USER}",
        f"--dbname={DB_NAME}",
        "--no-owner",
        "--no-acl",
        f"--table={table_name}"
    ]
    
    if schema_only:
        options.append("--schema-only")
    
    if where_clause:
        # For data filtering, we'll use a different approach with psql
        return export_filtered_data(table_name, where_clause)
    
    # Execute pg_dump
    try:
        cmd = ["pg_dump"] + options
        with open(filename, 'w') as f:
            subprocess.run(cmd, stdout=f, check=True, env={"PGPASSWORD": DB_PASSWORD})
        logger.info(f"Exported {table_name} to {filename}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to export {table_name}: {str(e)}")
        return False

async def export_filtered_data(table_name, where_clause):
    """Export filtered data from a table using psql"""
    filename = f"{SEED_DIR}/03_{table_name}_filtered_data.sql"
    
    # Construct SQL query
    sql_query = f"""
    COPY (
        SELECT * FROM {table_name}
        WHERE {where_clause}
    ) TO STDOUT WITH CSV HEADER;
    """
    
    # Execute psql
    try:
        cmd = [
            "psql",
            f"--host={DB_HOST}",
            f"--port={DB_PORT}",
            f"--username={DB_USER}",
            f"--dbname={DB_NAME}",
            "-c", sql_query
        ]
        
        with open(f"{filename}.csv", 'w') as f:
            subprocess.run(cmd, stdout=f, check=True, env={"PGPASSWORD": DB_PASSWORD})
        
        # Convert CSV to SQL INSERT statements
        await csv_to_sql(f"{filename}.csv", filename, table_name)
        
        # Remove temporary CSV file
        os.remove(f"{filename}.csv")
        
        logger.info(f"Exported filtered {table_name} data to {filename}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to export filtered data from {table_name}: {str(e)}")
        return False

async def csv_to_sql(csv_file, sql_file, table_name):
    """Convert CSV file to SQL INSERT statements"""
    import csv
    
    with open(csv_file, 'r') as csvfile, open(sql_file, 'w') as sqlfile:
        # Write header
        sqlfile.write(f"-- Filtered data from {table_name}\n")
        sqlfile.write(f"-- Generated on {datetime.now().isoformat()}\n\n")
        
        # Parse CSV
        reader = csv.reader(csvfile)
        headers = next(reader)  # Get column names
        
        # Write SQL for each row
        for row in reader:
            values = []
            for value in row:
                if value == '':
                    values.append('NULL')
                elif value.lower() in ('true', 'false'):
                    values.append(value)
                elif value.replace('.', '', 1).isdigit():
                    values.append(value)
                else:
                    values.append(f"'{value.replace('\'', '\'\'')}'")
            
            sqlfile.write(f"INSERT INTO {table_name} ({', '.join(headers)}) VALUES ({', '.join(values)});\n")

async def main():
    """Main function to export database data"""
    # Create seed directory if it doesn't exist
    os.makedirs(SEED_DIR, exist_ok=True)
    
    # Export asset table (essential data)
    await export_table("assets")
    
    # Export price data (limited to last 30 days to reduce size)
    recent_date = datetime.now().strftime("%Y-%m-%d 00:00:00")
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d 00:00:00")
    
    await export_table("price", where_clause=f"timestamp >= '{thirty_days_ago}' AND timestamp <= '{recent_date}'")
    
    # Export sample test data (limit to 5 tests per asset)
    await export_table("test", where_clause="id IN (SELECT id FROM test ORDER BY created_at DESC LIMIT 40)")
    
    # Export test_attempt data for exported tests
    await export_table("test_attempt", where_clause="test_id IN (SELECT id FROM test ORDER BY created_at DESC LIMIT 40)")
    
    logger.info("Database export complete")

if __name__ == "__main__":
    asyncio.run(main()) 