"""
Company schemas for request/response validation.
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, validator


class CompanyBase(BaseModel):
    """Base company schema."""
    name: str
    siren: Optional[str] = Field(None, min_length=9, max_length=9)
    siret: Optional[str] = Field(None, min_length=14, max_length=14)
    ape_code: Optional[str] = None
    
    legal_form: str = "SASU"
    creation_date: Optional[date] = None
    fiscal_year_start: int = Field(1, ge=1, le=12)
    fiscal_year_end: int = Field(12, ge=1, le=12)
    
    address_street: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_city: Optional[str] = None
    address_country: str = "FR"
    
    vat_number: Optional[str] = None
    vat_regime: Optional[str] = None
    is_vat_registered: bool = False
    corporate_tax_regime: str = "IS"
    
    urssaf_number: Optional[str] = None
    president_social_security_number: Optional[str] = None
    president_remuneration_type: Optional[str] = "salary"
    
    share_capital: float = Field(1.0, ge=1.0)
    number_of_shares: int = Field(1, ge=1)
    accounting_software: Optional[str] = None
    
    president_first_name: Optional[str] = None
    president_last_name: Optional[str] = None
    president_birth_date: Optional[date] = None
    president_birth_place: Optional[str] = None
    
    bank_name: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_bic: Optional[str] = None
    
    is_active: bool = True
    is_dormant: bool = False
    
    @validator('siren')
    def validate_siren(cls, v):
        if v and not v.isdigit():
            raise ValueError('SIREN must contain only digits')
        return v
    
    @validator('siret')
    def validate_siret(cls, v):
        if v and not v.isdigit():
            raise ValueError('SIRET must contain only digits')
        return v


class CompanyCreate(CompanyBase):
    """Schema for creating a new company."""
    pass


class CompanyUpdate(BaseModel):
    """Schema for updating a company."""
    name: Optional[str] = None
    siren: Optional[str] = Field(None, min_length=9, max_length=9)
    siret: Optional[str] = Field(None, min_length=14, max_length=14)
    ape_code: Optional[str] = None
    
    legal_form: Optional[str] = None
    creation_date: Optional[date] = None
    fiscal_year_start: Optional[int] = Field(None, ge=1, le=12)
    fiscal_year_end: Optional[int] = Field(None, ge=1, le=12)
    
    address_street: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_city: Optional[str] = None
    address_country: Optional[str] = None
    
    vat_number: Optional[str] = None
    vat_regime: Optional[str] = None
    is_vat_registered: Optional[bool] = None
    corporate_tax_regime: Optional[str] = None
    
    urssaf_number: Optional[str] = None
    president_social_security_number: Optional[str] = None
    president_remuneration_type: Optional[str] = None
    
    share_capital: Optional[float] = Field(None, ge=1.0)
    number_of_shares: Optional[int] = Field(None, ge=1)
    accounting_software: Optional[str] = None
    
    president_first_name: Optional[str] = None
    president_last_name: Optional[str] = None
    president_birth_date: Optional[date] = None
    president_birth_place: Optional[str] = None
    
    bank_name: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_bic: Optional[str] = None
    
    is_active: Optional[bool] = None
    is_dormant: Optional[bool] = None


class CompanyInDBBase(CompanyBase):
    """Base schema for company in database."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Company(CompanyInDBBase):
    """Schema for company response."""
    pass


class CompanyWithStats(Company):
    """Schema for company with statistics."""
    total_tax_calculations: int = 0
    total_documents: int = 0
    last_calculation_date: Optional[datetime] = None