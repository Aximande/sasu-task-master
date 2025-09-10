"""
Company model for SASU information and settings.
"""
from datetime import datetime, date
from typing import Optional
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class Company(Base):
    """SASU company model."""
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    
    # Basic Information
    name = Column(String(255), nullable=False)
    siren = Column(String(9), unique=True, index=True)
    siret = Column(String(14), unique=True, index=True)
    ape_code = Column(String(10))
    
    # Legal Information
    legal_form = Column(String(50), default="SASU")
    creation_date = Column(Date)
    fiscal_year_start = Column(Integer, default=1)  # Month (1-12)
    fiscal_year_end = Column(Integer, default=12)  # Month (1-12)
    
    # Address
    address_street = Column(String(255))
    address_postal_code = Column(String(10))
    address_city = Column(String(100))
    address_country = Column(String(2), default="FR")
    
    # Tax Information
    vat_number = Column(String(20))
    vat_regime = Column(String(50))  # réel simplifié, réel normal, franchise
    is_vat_registered = Column(Boolean(), default=False)
    corporate_tax_regime = Column(String(50))  # IS, IR
    
    # Social Security & Employment
    urssaf_number = Column(String(50))
    president_social_security_number = Column(String(15))
    president_remuneration_type = Column(String(50))  # salary, dividends, both
    
    # Financial Settings
    share_capital = Column(Float, default=1.0)
    number_of_shares = Column(Integer, default=1)
    accounting_software = Column(String(100))
    
    # President Information
    president_first_name = Column(String(100))
    president_last_name = Column(String(100))
    president_birth_date = Column(Date)
    president_birth_place = Column(String(100))
    
    # Bank Information
    bank_name = Column(String(100))
    bank_iban = Column(String(34))
    bank_bic = Column(String(11))
    
    # Status
    is_active = Column(Boolean(), default=True)
    is_dormant = Column(Boolean(), default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Additional settings (JSON)
    settings = Column(Text)  # JSON field for additional company-specific settings
    
    # Relationships
    owner = relationship("User", back_populates="companies")
    tax_calculations = relationship("TaxCalculation", back_populates="company", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="company", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Company {self.name} ({self.siren})>"