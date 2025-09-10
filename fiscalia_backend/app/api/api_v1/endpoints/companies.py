"""
Company management endpoints.
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api import deps
from app.db.dependencies import get_db
from app.models.company import Company
from app.models.tax_calculation import TaxCalculation
from app.models.document import Document
from app.models.user import User
from app.schemas.company import (
    Company as CompanySchema,
    CompanyCreate,
    CompanyUpdate,
    CompanyWithStats
)

router = APIRouter()


@router.get("/", response_model=List[CompanySchema])
def get_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get all companies for the current user.
    """
    companies = (
        db.query(Company)
        .filter(Company.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return companies


@router.post("/", response_model=CompanySchema)
def create_company(
    *,
    db: Session = Depends(get_db),
    company_in: CompanyCreate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Create a new company for the current user.
    """
    # Check if SIREN already exists for this user
    if company_in.siren:
        existing = (
            db.query(Company)
            .filter(
                Company.user_id == current_user.id,
                Company.siren == company_in.siren
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company with this SIREN already exists"
            )
    
    # Create new company
    company = Company(
        **company_in.model_dump(),
        user_id=current_user.id
    )
    
    db.add(company)
    db.commit()
    db.refresh(company)
    
    return company


@router.get("/{company_id}", response_model=CompanyWithStats)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get a specific company by ID.
    """
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == current_user.id
        )
        .first()
    )
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Get statistics
    total_calculations = (
        db.query(func.count(TaxCalculation.id))
        .filter(TaxCalculation.company_id == company_id)
        .scalar()
    )
    
    total_documents = (
        db.query(func.count(Document.id))
        .filter(Document.company_id == company_id)
        .scalar()
    )
    
    last_calculation = (
        db.query(TaxCalculation.created_at)
        .filter(TaxCalculation.company_id == company_id)
        .order_by(TaxCalculation.created_at.desc())
        .first()
    )
    
    # Convert to schema with stats
    company_dict = company.__dict__.copy()
    company_dict['total_tax_calculations'] = total_calculations or 0
    company_dict['total_documents'] = total_documents or 0
    company_dict['last_calculation_date'] = last_calculation[0] if last_calculation else None
    
    return CompanyWithStats(**company_dict)


@router.put("/{company_id}", response_model=CompanySchema)
def update_company(
    *,
    db: Session = Depends(get_db),
    company_id: int,
    company_update: CompanyUpdate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update a company.
    """
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == current_user.id
        )
        .first()
    )
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Update company fields
    update_data = company_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    
    return company


@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Delete a company and all related data.
    """
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == current_user.id
        )
        .first()
    )
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Delete company (cascade will handle related records)
    db.delete(company)
    db.commit()
    
    return {"message": "Company deleted successfully"}


@router.post("/{company_id}/activate")
def activate_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Activate a dormant company.
    """
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == current_user.id
        )
        .first()
    )
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    company.is_active = True
    company.is_dormant = False
    db.commit()
    
    return {"message": "Company activated successfully"}


@router.post("/{company_id}/deactivate")
def deactivate_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Mark a company as dormant.
    """
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == current_user.id
        )
        .first()
    )
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    company.is_active = False
    company.is_dormant = True
    db.commit()
    
    return {"message": "Company marked as dormant"}