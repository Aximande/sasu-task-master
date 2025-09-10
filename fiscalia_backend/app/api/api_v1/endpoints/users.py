"""
User management endpoints.
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserSchema)
def get_current_user(
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.put("/me", response_model=UserSchema)
def update_current_user(
    *,
    db: Session = Depends(get_db),
    user_update: UserUpdate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update current user.
    """
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Don't allow users to make themselves superusers
    if "is_superuser" in update_data:
        del update_data["is_superuser"]
    
    # Update password if provided
    if "password" in update_data:
        from app.core import security
        hashed_password = security.get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password
    
    # Update user fields
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/{user_id}", response_model=UserSchema)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Get a specific user by ID (superuser only).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.get("/", response_model=List[UserSchema])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Get all users (superuser only).
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Delete a user (superuser only).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow deleting the last superuser
    if user.is_superuser:
        superuser_count = db.query(User).filter(User.is_superuser == True).count()
        if superuser_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last superuser"
            )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}