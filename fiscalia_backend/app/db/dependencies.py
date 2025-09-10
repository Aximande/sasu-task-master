"""
Database dependencies for FastAPI.
"""
from typing import Generator
from sqlalchemy.orm import Session
from app.db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session.
    
    Yields:
        Database session that will be closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()