"""make doctor_id nullable in appointments

Revision ID: 001
Revises: 
Create Date: 2026-05-11 19:42:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("appointments", "doctor_id", nullable=True)


def downgrade() -> None:
    op.alter_column("appointments", "doctor_id", nullable=False)
