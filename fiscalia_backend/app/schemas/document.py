"""
Document schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import UploadFile


class DocumentBase(BaseModel):
    """Base document schema."""
    company_id: Optional[int] = None
    document_type: str  # invoice, receipt, tax_declaration, payslip, etc.
    document_subtype: Optional[str] = None
    title: str
    description: Optional[str] = None
    
    document_date: Optional[datetime] = None
    document_number: Optional[str] = None
    
    amount_ht: Optional[float] = Field(None, ge=0)
    amount_tva: Optional[float] = Field(None, ge=0)
    amount_ttc: Optional[float] = Field(None, ge=0)
    currency: str = "EUR"
    
    counterparty_name: Optional[str] = None
    counterparty_siren: Optional[str] = None
    counterparty_vat_number: Optional[str] = None
    
    category: Optional[str] = None
    fiscal_year: Optional[int] = None
    accounting_period: Optional[str] = None
    
    notes: Optional[str] = None


class DocumentCreate(DocumentBase):
    """Schema for creating a new document."""
    pass


class DocumentUpdate(BaseModel):
    """Schema for updating a document."""
    title: Optional[str] = None
    description: Optional[str] = None
    document_date: Optional[datetime] = None
    document_number: Optional[str] = None
    
    amount_ht: Optional[float] = Field(None, ge=0)
    amount_tva: Optional[float] = Field(None, ge=0)
    amount_ttc: Optional[float] = Field(None, ge=0)
    
    counterparty_name: Optional[str] = None
    counterparty_siren: Optional[str] = None
    
    category: Optional[str] = None
    fiscal_year: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class DocumentUpload(BaseModel):
    """Schema for document upload request."""
    company_id: Optional[int] = None
    document_type: str
    title: str
    description: Optional[str] = None
    auto_process: bool = True  # Automatically process with AI


class DocumentInDBBase(DocumentBase):
    """Base schema for document in database."""
    id: int
    user_id: int
    
    file_name: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    file_hash: Optional[str] = None
    
    status: str
    is_processed: bool
    is_validated: bool
    processed_at: Optional[datetime] = None
    validated_at: Optional[datetime] = None
    
    ai_confidence_score: Optional[float] = None
    
    is_compliant: Optional[bool] = None
    requires_action: bool
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Document(DocumentInDBBase):
    """Schema for document response."""
    pass


class DocumentWithExtractedData(Document):
    """Schema for document with AI extracted data."""
    ai_extracted_data: Optional[Dict[str, Any]] = None
    ai_suggestions: Optional[List[str]] = None
    compliance_issues: Optional[List[str]] = None


class DocumentProcessingResult(BaseModel):
    """Schema for document processing result."""
    document_id: int
    status: str  # success, failed, partial
    
    extracted_data: Dict[str, Any]
    confidence_score: float
    
    document_type_detected: str
    amounts_detected: Optional[Dict[str, float]] = None
    dates_detected: Optional[Dict[str, str]] = None
    entities_detected: Optional[Dict[str, str]] = None
    
    suggestions: List[str]
    warnings: Optional[List[str]] = None
    
    processing_time_ms: int


class DocumentSearchRequest(BaseModel):
    """Schema for document search request."""
    query: Optional[str] = None
    company_id: Optional[int] = None
    document_type: Optional[str] = None
    status: Optional[str] = None
    
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    
    counterparty: Optional[str] = None
    category: Optional[str] = None
    fiscal_year: Optional[int] = None
    
    requires_action: Optional[bool] = None
    is_validated: Optional[bool] = None
    
    limit: int = Field(100, le=500)
    offset: int = 0


class DocumentStatistics(BaseModel):
    """Schema for document statistics."""
    total_documents: int
    documents_by_type: Dict[str, int]
    documents_by_status: Dict[str, int]
    
    total_amount_ttc: float
    total_vat: float
    
    documents_requiring_action: int
    documents_pending_validation: int
    
    average_processing_confidence: float
    documents_processed_this_month: int
    
    storage_used_mb: float