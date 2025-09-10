"""
User schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    subscription_plan: str = "free"
    preferred_language: str = "fr"
    timezone: str = "Europe/Paris"


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str


class UserUpdate(UserBase):
    """Schema for updating a user."""
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_plan: Optional[str] = None
    preferred_language: Optional[str] = None
    timezone: Optional[str] = None


class UserInDBBase(UserBase):
    """Base schema for user in database."""
    id: int
    created_at: datetime
    updated_at: datetime
    is_verified: bool
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class User(UserInDBBase):
    """Schema for user response."""
    pass


class UserInDB(UserInDBBase):
    """Schema for user in database with password."""
    hashed_password: str