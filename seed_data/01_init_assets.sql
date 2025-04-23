-- Asset initialization SQL for trading app
-- This file will be automatically executed when the PostgreSQL container starts

-- Create extension for UUID support if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if tables exist (they should be created by alembic migrations)
-- But we'll add this check in case running in a different sequence
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'assets') THEN
        RAISE NOTICE 'Tables not yet created. This seed file assumes tables already exist. Exiting.';
        RETURN;
    END IF;
END
$$;

-- Insert crypto assets
INSERT INTO assets (symbol, name, api_id, type, is_active, created_at, updated_at)
VALUES 
    ('btc', 'Bitcoin', 'bitcoin', 'crypto', TRUE, NOW(), NOW()),
    ('eth', 'Ethereum', 'ethereum', 'crypto', TRUE, NOW(), NOW()),
    ('sol', 'Solana', 'solana', 'crypto', TRUE, NOW(), NOW()),
    ('bnb', 'Binance Coin', 'binancecoin', 'crypto', TRUE, NOW(), NOW())
ON CONFLICT (symbol) DO NOTHING;

-- Insert equity assets
INSERT INTO assets (symbol, name, api_id, type, is_active, created_at, updated_at)
VALUES 
    ('nvda', 'Nvidia', 'NVDA', 'equity', TRUE, NOW(), NOW()),
    ('aapl', 'Apple', 'AAPL', 'equity', TRUE, NOW(), NOW()),
    ('tsla', 'Tesla', 'TSLA', 'equity', TRUE, NOW(), NOW()),
    ('gld', 'Gold', 'GLD', 'equity', TRUE, NOW(), NOW())
ON CONFLICT (symbol) DO NOTHING; 