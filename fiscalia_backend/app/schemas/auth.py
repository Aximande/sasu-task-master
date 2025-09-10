"""
Authentication schemas for request/response validation.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Token payload schema."""
    sub: Optional[int] = None


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """Registration request schema."""
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None


class PasswordReset(BaseModel):
    """Password reset request schema."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema."""
    token: str
    new_password: str


class PasswordChange(BaseModel):
    """Password change request schema."""
    current_password: str
    new_password: str