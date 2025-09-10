"""
Tax calculation schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator


class TaxCalculationBase(BaseModel):
    """Base tax calculation schema."""
    company_id: Optional[int] = None
    calculation_type: str  # salary, dividend, mixed, annual
    tax_year: int
    period_type: Optional[str] = None  # monthly, quarterly, annual
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    
    # Input parameters
    gross_salary: float = Field(0.0, ge=0)
    net_salary: float = Field(0.0, ge=0)
    dividends: float = Field(0.0, ge=0)
    other_income: float = Field(0.0, ge=0)
    
    revenue: float = Field(0.0, ge=0)
    expenses: float = Field(0.0, ge=0)
    profit_before_tax: float = Field(0.0, ge=0)
    
    scenario_name: Optional[str] = None
    scenario_description: Optional[str] = None
    notes: Optional[str] = None


class TaxCalculationCreate(TaxCalculationBase):
    """Schema for creating a new tax calculation."""
    pass


class TaxCalculationRequest(BaseModel):
    """Schema for tax calculation request."""
    company_id: Optional[int] = None
    calculation_type: str = "mixed"
    tax_year: int = 2024
    
    # President remuneration
    gross_salary: float = Field(0.0, ge=0)
    dividends: float = Field(0.0, ge=0)
    
    # Company financials
    revenue: float = Field(0.0, ge=0)
    expenses: float = Field(0.0, ge=0)
    
    # Options
    optimize: bool = False
    include_recommendations: bool = True
    scenario_name: Optional[str] = None


class TaxCalculationResult(BaseModel):
    """Schema for tax calculation result."""
    # Input echo
    gross_salary: float
    dividends: float
    revenue: float
    expenses: float
    profit_before_tax: float
    
    # Calculated values
    net_salary: float
    employer_social_charges: float
    employee_social_charges: float
    total_social_charges: float
    
    corporate_tax: float
    income_tax: float
    dividend_tax: float
    vat_to_pay: float
    
    total_taxes: float
    net_income_after_tax: float
    effective_tax_rate: float
    
    # Optimization
    optimization_potential: float
    suggested_salary: Optional[float] = None
    suggested_dividends: Optional[float] = None
    
    # Details
    calculation_details: Dict[str, Any]
    recommendations: Optional[List[str]] = None


class TaxCalculationUpdate(BaseModel):
    """Schema for updating a tax calculation."""
    scenario_name: Optional[str] = None
    scenario_description: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TaxCalculationInDBBase(TaxCalculationBase):
    """Base schema for tax calculation in database."""
    id: int
    user_id: int
    
    # Calculated values
    employer_social_charges: float
    employee_social_charges: float
    total_social_charges: float
    
    corporate_tax: float
    income_tax: float
    dividend_tax: float
    vat_collected: float
    vat_deductible: float
    vat_to_pay: float
    cfe: float
    cvae: float
    
    total_taxes: float
    net_income_after_tax: float
    effective_tax_rate: float
    
    optimization_potential: float
    suggested_salary: Optional[float] = None
    suggested_dividends: Optional[float] = None
    
    is_optimized: bool
    status: str
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TaxCalculation(TaxCalculationInDBBase):
    """Schema for tax calculation response."""
    pass


class TaxOptimizationRequest(BaseModel):
    """Schema for tax optimization request."""
    company_id: int
    target_net_income: float = Field(gt=0)
    tax_year: int = 2024
    
    # Constraints
    min_salary: Optional[float] = Field(None, ge=0)
    max_salary: Optional[float] = Field(None, ge=0)
    min_dividends: Optional[float] = Field(None, ge=0)
    max_dividends: Optional[float] = Field(None, ge=0)
    
    # Company financials
    revenue: float = Field(gt=0)
    expenses: float = Field(ge=0)


class TaxOptimizationResult(BaseModel):
    """Schema for tax optimization result."""
    optimal_gross_salary: float
    optimal_dividends: float
    
    net_income_achieved: float
    total_tax_burden: float
    effective_tax_rate: float
    
    savings_vs_all_salary: float
    savings_vs_all_dividends: float
    
    breakdown: Dict[str, float]
    recommendations: List[str]
    warnings: Optional[List[str]] = None