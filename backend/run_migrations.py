import logging
import os
import sys
from alembic import command
from alembic.config import Config
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run migrations using alembic"""
    try:
        # Get directory of this file
        dir_path = os.path.dirname(os.path.realpath(__file__))
        
        # Create Alembic config
        alembic_cfg = Config(os.path.join(dir_path, "alembic.ini"))
        
        # Log the configuration
        db_url = alembic_cfg.get_main_option("sqlalchemy.url")
        logger.info(f"Running migrations with database URL: {db_url}")
        
        # Run the migration
        command.upgrade(alembic_cfg, "head")
        
        logger.info("Migration completed successfully!")
        return True
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1) 