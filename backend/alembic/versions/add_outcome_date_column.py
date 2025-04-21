"""add outcome_date column

Revision ID: add_outcome_date_column
Revises: 01d2c3a4b5e6
Create Date: 2023-09-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import column, table


# revision identifiers, used by Alembic.
revision: str = 'add_outcome_date_column'
down_revision: Union[str, None] = '01d2c3a4b5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add outcome_date column to test_data table
    op.add_column('test_data', sa.Column('outcome_date', sa.Date(), nullable=True))


def downgrade() -> None:
    # Remove outcome_date column from test_data table
    op.drop_column('test_data', 'outcome_date') 