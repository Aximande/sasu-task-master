"""
Tax calculation model for storing tax simulations and calculations.
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class TaxCalculation(Base):
    """Model for storing tax calculations and simulations."""
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("company.id"))
    
    # Calculation Type & Period
    calculation_type = Column(String(50), nullable=False)  # salary, dividend, mixed, annual
    tax_year = Column(Integer, nullable=False)
    period_type = Column(String(20))  # monthly, quarterly, annual
    period_start = Column(DateTime)
    period_end = Column(DateTime)
    
    # Input Parameters - President Remuneration
    gross_salary = Column(Float, default=0.0)
    net_salary = Column(Float, default=0.0)
    dividends = Column(Float, default=0.0)
    other_income = Column(Float, default=0.0)
    
    # Input Parameters - Company Revenue
    revenue = Column(Float, default=0.0)
    expenses = Column(Float, default=0.0)
    profit_before_tax = Column(Float, default=0.0)
    
    # Calculated Social Charges
    employer_social_charges = Column(Float, default=0.0)
    employee_social_charges = Column(Float, default=0.0)
    total_social_charges = Column(Float, default=0.0)
    
    # Calculated Taxes
    corporate_tax = Column(Float, default=0.0)  # IS
    income_tax = Column(Float, default=0.0)  # IR
    dividend_tax = Column(Float, default=0.0)  # PFU
    vat_collected = Column(Float, default=0.0)
    vat_deductible = Column(Float, default=0.0)
    vat_to_pay = Column(Float, default=0.0)
    cfe = Column(Float, default=0.0)  # Cotisation Foncière des Entreprises
    cvae = Column(Float, default=0.0)  # Cotisation sur la Valeur Ajoutée
    
    # Summary Results
    total_taxes = Column(Float, default=0.0)
    net_income_after_tax = Column(Float, default=0.0)
    effective_tax_rate = Column(Float, default=0.0)
    
    # Optimization Suggestions
    optimization_potential = Column(Float, default=0.0)
    suggested_salary = Column(Float)
    suggested_dividends = Column(Float)
    
    # Scenario Details
    scenario_name = Column(String(255))
    scenario_description = Column(Text)
    is_optimized = Column(Boolean(), default=False)
    
    # Detailed Breakdown (JSON)
    calculation_details = Column(Text)  # JSON with detailed breakdown
    assumptions = Column(Text)  # JSON with calculation assumptions
    recommendations = Column(Text)  # JSON with tax optimization recommendations
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Status
    status = Column(String(50), default="draft")  # draft, final, archived
    notes = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="tax_calculations")
    company = relationship("Company", back_populates="tax_calculations")
    
    def __repr__(self) -> str:
        return f"<TaxCalculation {self.calculation_type} - {self.tax_year}>"