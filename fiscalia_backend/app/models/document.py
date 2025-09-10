"""
Document model for storing and managing fiscal documents.
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.core.timezone import now_paris


class Document(Base):
    """Model for storing fiscal documents and files."""
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("company.id"))
    
    # Document Information
    document_type = Column(String(50), nullable=False)  # invoice, receipt, tax_declaration, payslip, etc.
    document_subtype = Column(String(50))  # sales_invoice, purchase_invoice, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # File Information
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500))
    file_size = Column(Integer)  # in bytes
    file_type = Column(String(50))  # pdf, jpg, png, etc.
    file_hash = Column(String(64))  # SHA-256 hash for integrity
    
    # Document Metadata
    document_date = Column(DateTime)
    document_number = Column(String(100))  # Invoice number, declaration number, etc.
    
    # Financial Information (if applicable)
    amount_ht = Column(Float)  # Amount excluding tax
    amount_tva = Column(Float)  # VAT amount
    amount_ttc = Column(Float)  # Total amount including tax
    currency = Column(String(3), default="EUR")
    
    # Counterparty Information
    counterparty_name = Column(String(255))
    counterparty_siren = Column(String(9))
    counterparty_vat_number = Column(String(20))
    
    # Processing Status
    status = Column(String(50), default="pending")  # pending, processed, validated, rejected
    is_processed = Column(Boolean(), default=False)
    is_validated = Column(Boolean(), default=False)
    processed_at = Column(DateTime)
    validated_at = Column(DateTime)
    
    # AI Processing Results
    ocr_text = Column(Text)  # Extracted text from OCR
    ai_extracted_data = Column(Text)  # JSON with AI-extracted structured data
    ai_confidence_score = Column(Float)  # Confidence score of AI extraction
    ai_suggestions = Column(Text)  # JSON with AI suggestions
    
    # Categorization
    category = Column(String(100))
    tags = Column(Text)  # JSON array of tags
    fiscal_year = Column(Integer)
    accounting_period = Column(String(20))  # 2024-Q1, 2024-M01, etc.
    
    # Compliance & Validation
    is_compliant = Column(Boolean())
    compliance_issues = Column(Text)  # JSON array of compliance issues
    requires_action = Column(Boolean(), default=False)
    action_required = Column(Text)
    
    # Storage & Archiving
    storage_location = Column(String(50), default="local")  # local, s3, gcs, etc.
    archive_date = Column(DateTime)
    retention_period = Column(Integer)  # in months
    can_be_deleted = Column(Boolean(), default=False)
    
    # Metadata
    created_at = Column(DateTime, default=now_paris, nullable=False)
    updated_at = Column(DateTime, default=now_paris, onupdate=now_paris, nullable=False)
    uploaded_by = Column(String(255))
    
    # Notes & Comments
    notes = Column(Text)
    internal_notes = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="documents")
    company = relationship("Company", back_populates="documents")
    
    def __repr__(self) -> str:
        return f"<Document {self.document_type} - {self.title}>"