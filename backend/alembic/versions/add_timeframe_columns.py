"""add_timeframe_columns

Revision ID: 01d2c3a4b5e6
Revises: 
Create Date: 2025-04-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '01d2c3a4b5e6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add timeframe column to price_data table
    op.add_column('price_data', sa.Column('timeframe', sa.String(), nullable=True, server_default='daily'))
    # Create index for timeframe
    op.create_index(op.f('ix_price_data_timeframe'), 'price_data', ['timeframe'], unique=False)
    
    # Add timeframe column to test_data table
    op.add_column('test_data', sa.Column('timeframe', sa.String(), nullable=True, server_default='daily'))
    
    # Add timeframe column to user_results table
    op.add_column('user_results', sa.Column('timeframe', sa.String(), nullable=True))


def downgrade():
    # Remove timeframe column from user_results table
    op.drop_column('user_results', 'timeframe')
    
    # Remove timeframe column from test_data table
    op.drop_column('test_data', 'timeframe')
    
    # Remove index for timeframe
    op.drop_index(op.f('ix_price_data_timeframe'), table_name='price_data')
    # Remove timeframe column from price_data table
    op.drop_column('price_data', 'timeframe') 