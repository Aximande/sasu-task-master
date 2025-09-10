"""
User model for authentication and profile management.
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.core.timezone import now_paris


class User(Base):
    """User model for FiscalIA Pro."""
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(20))
    
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    is_verified = Column(Boolean(), default=False)
    
    created_at = Column(DateTime, default=now_paris, nullable=False)
    updated_at = Column(DateTime, default=now_paris, onupdate=now_paris, nullable=False)
    last_login = Column(DateTime)
    
    # Subscription & Plan
    subscription_plan = Column(String(50), default="free")  # free, starter, pro, enterprise
    subscription_status = Column(String(50), default="active")  # active, cancelled, expired
    subscription_expires_at = Column(DateTime)
    
    # Profile & Preferences
    preferred_language = Column(String(5), default="fr")
    timezone = Column(String(50), default="Europe/Paris")
    notification_preferences = Column(Text)  # JSON field for notification settings
    
    # Relationships
    companies = relationship("Company", back_populates="owner", cascade="all, delete-orphan")
    tax_calculations = relationship("TaxCalculation", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<User {self.email}>"