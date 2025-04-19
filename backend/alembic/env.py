# alembic/env.py
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import models and base
from app.models import item  # Import all models here
from app.core.database import Base
from app.core.config import settings

# Alembic configuration
config = context.config

# Set SQLAlchemy URL from settings
config.set_main_option("sqlalchemy.url", str(settings.DATABASE_URL))

# Configure logging
fileConfig(config.config_file_name)

# Set metadata target
target_metadata = Base.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()