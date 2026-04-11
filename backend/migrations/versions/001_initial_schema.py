"""Initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-04-11

Creates all base tables: users, jobs, resumes, job_applications

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - create all tables."""
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'])
    
    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('position_id', sa.String(100), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('company', sa.String(255), nullable=False),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('requirements', sa.Text(), nullable=True),
        sa.Column('salary_range', sa.String(100), nullable=True),
        sa.Column('job_type', sa.String(50), nullable=True),
        sa.Column('source_url', sa.String(500), nullable=True),
        sa.Column('update_date', sa.String(20), nullable=True),
        sa.Column('company_type', sa.String(50), nullable=True),
        sa.Column('industry', sa.String(255), nullable=True),
        sa.Column('credit_score', sa.String(20), nullable=True),
        sa.Column('match_score', sa.String(20), nullable=True),
        sa.Column('education', sa.String(50), nullable=True),
        sa.Column('grade', sa.String(50), nullable=True),
        sa.Column('major', sa.Text(), nullable=True),
        sa.Column('detail_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_jobs_id', 'jobs', ['id'])
    op.create_index('ix_jobs_title', 'jobs', ['title'])
    op.create_index('ix_jobs_company', 'jobs', ['company'])
    op.create_index('ix_jobs_position_id', 'jobs', ['position_id'], unique=True)
    
    # Create resumes table
    op.create_table(
        'resumes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('original_text', sa.Text(), nullable=True),
        sa.Column('optimized_text', sa.Text(), nullable=True),
        sa.Column('is_primary', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='resumes_user_id_fkey'),
    )
    op.create_index('ix_resumes_id', 'resumes', ['id'])
    
    # Create job_applications table
    op.create_table(
        'job_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'applied', 'interview', 'offer', 'rejected', name='applicationstatus'), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='job_applications_user_id_fkey'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], name='job_applications_job_id_fkey'),
    )
    op.create_index('ix_job_applications_id', 'job_applications', ['id'])


def downgrade() -> None:
    """Downgrade schema - drop all tables."""
    op.drop_index('ix_job_applications_id', table_name='job_applications')
    op.drop_table('job_applications')
    
    op.drop_index('ix_resumes_id', table_name='resumes')
    op.drop_table('resumes')
    
    op.drop_index('ix_jobs_position_id', table_name='jobs')
    op.drop_index('ix_jobs_company', table_name='jobs')
    op.drop_index('ix_jobs_title', table_name='jobs')
    op.drop_index('ix_jobs_id', table_name='jobs')
    op.drop_table('jobs')
    
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_id', table_name='users')
    op.drop_table('users')
    
    # Drop enum type
    op.execute("DROP TYPE IF EXISTS applicationstatus")
