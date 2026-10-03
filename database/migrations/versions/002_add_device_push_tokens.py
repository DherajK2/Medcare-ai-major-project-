"""Add device_push_tokens table for mobile push notification support.

Revision ID: 002_add_device_push_tokens
Revises: 001_initial
Create Date: 2026-09-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = "002_add_device_push_tokens"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_push_tokens",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Full token string (ExponentPushToken[xxx] or raw FCM token)
        sa.Column("token", sa.Text(), nullable=False),
        # "expo" | "fcm" | "apns"
        sa.Column("provider", sa.String(20), nullable=False, server_default="expo"),
        sa.Column("device_label", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
        ),
    )

    # Unique constraint: one row per (user, token) pair
    op.create_unique_constraint(
        "uq_device_push_tokens_user_token",
        "device_push_tokens",
        ["user_id", "token"],
    )

    # Index for fast lookups by user
    op.create_index(
        "ix_device_push_tokens_user_id",
        "device_push_tokens",
        ["user_id"],
    )

    # Index so we can quickly find all active tokens
    op.create_index(
        "ix_device_push_tokens_active",
        "device_push_tokens",
        ["user_id", "is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_device_push_tokens_active", table_name="device_push_tokens")
    op.drop_index("ix_device_push_tokens_user_id", table_name="device_push_tokens")
    op.drop_constraint(
        "uq_device_push_tokens_user_token",
        "device_push_tokens",
        type_="unique",
    )
    op.drop_table("device_push_tokens")
