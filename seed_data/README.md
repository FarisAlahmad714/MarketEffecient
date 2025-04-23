# Database Seed Data

This directory contains SQL files that are automatically executed when the PostgreSQL container starts.
These files provide the initial data for the application, eliminating the need for lengthy API calls during startup.

## Files

- `01_init_assets.sql`: Basic asset definitions (Bitcoin, Ethereum, etc.)
- Additional SQL files may be generated from the production database

## Generating Seed Data

To generate seed data from an existing database:

1. Make sure you have a running instance with data you want to preserve
2. Run the export script:

```bash
cd backend/scripts
python export_db_data.py
```

This will generate SQL files in the `seed_data` directory containing:
- Asset definitions
- Recent price data (last 30 days)
- Sample test data

## Manual Data Additions

You can also manually create SQL files to be executed on container startup.
Files are executed in alphabetical order, so use numbering (e.g., `01_`, `02_`) to control execution order.

## Benefits

- Dramatically faster application startup
- No reliance on external APIs during initialization
- Easier local development and testing
- Consistent test data across environments 