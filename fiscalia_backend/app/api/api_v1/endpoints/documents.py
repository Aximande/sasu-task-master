"""
Document management endpoints.
"""
import json
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime

from app.api import deps
from app.db.dependencies import get_db
from app.models.user import User
from app.models.company import Company
from app.models.document import Document as DocumentModel
from app.schemas.document import (
    Document as DocumentSchema,
    DocumentCreate,
    DocumentUpdate,
    DocumentWithExtractedData,
    DocumentProcessingResult,
    DocumentSearchRequest,
    DocumentStatistics
)
from app.services.storage import storage_service
from app.services.ai_service import AIDocumentProcessor

router = APIRouter()


@router.post("/upload", response_model=DocumentSchema)
async def upload_document(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
    file: UploadFile = File(...),
    company_id: Optional[int] = Form(None),
    document_type: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    auto_process: bool = Form(True)
) -> Any:
    """
    Upload and optionally process a document.
    """
    # Verify company ownership if provided
    if company_id:
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
    
    # Validate file type
    allowed_types = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
    file_extension = '.' + file.filename.split('.')[-1].lower()
    if file_extension not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Save file to storage
    file_path, file_hash, file_size = await storage_service.save_file(
        file, current_user.id, company_id
    )
    
    # Create document record
    document = DocumentModel(
        user_id=current_user.id,
        company_id=company_id,
        document_type=document_type,
        title=title,
        description=description,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        file_type=file_extension,
        file_hash=file_hash,
        status="pending",
        is_processed=False,
        is_validated=False,
        requires_action=False
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Process document with AI if requested
    if auto_process:
        try:
            # Get file content for processing
            file_content = await storage_service.get_file(file_path)
            
            # Process with AI
            processor = AIDocumentProcessor()
            processing_result = await processor.process_document(
                file_content,
                file_extension,
                document_type
            )
            
            # Update document with processing results
            document.ai_extracted_data = json.dumps(processing_result['extracted_data'])
            document.ai_confidence_score = processing_result['confidence_score']
            document.ai_suggestions = json.dumps(processing_result['suggestions'])
            document.is_processed = True
            document.processed_at = datetime.utcnow()
            document.status = "processed"
            
            # Extract financial data if available
            if 'amount_ttc' in processing_result['extracted_data']:
                document.amount_ttc = processing_result['extracted_data']['amount_ttc']
            if 'amount_ht' in processing_result['extracted_data']:
                document.amount_ht = processing_result['extracted_data']['amount_ht']
            if 'amount_tva' in processing_result['extracted_data']:
                document.amount_tva = processing_result['extracted_data']['amount_tva']
            
            db.commit()
            db.refresh(document)
            
        except Exception as e:
            # Log error but don't fail the upload
            document.status = "processing_failed"
            document.notes = f"Processing error: {str(e)}"
            db.commit()
    
    return document


@router.get("/", response_model=List[DocumentSchema])
def get_documents(
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[int] = None,
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get all documents for the current user with optional filters.
    """
    query = db.query(DocumentModel).filter(
        DocumentModel.user_id == current_user.id
    )
    
    if company_id:
        query = query.filter(DocumentModel.company_id == company_id)
    
    if document_type:
        query = query.filter(DocumentModel.document_type == document_type)
    
    if status:
        query = query.filter(DocumentModel.status == status)
    
    documents = query.order_by(DocumentModel.created_at.desc()).offset(skip).limit(limit).all()
    return documents


@router.post("/search", response_model=List[DocumentWithExtractedData])
def search_documents(
    *,
    db: Session = Depends(get_db),
    search: DocumentSearchRequest,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Search documents with advanced filters.
    """
    query = db.query(DocumentModel).filter(
        DocumentModel.user_id == current_user.id
    )
    
    # Apply filters
    if search.company_id:
        query = query.filter(DocumentModel.company_id == search.company_id)
    
    if search.document_type:
        query = query.filter(DocumentModel.document_type == search.document_type)
    
    if search.status:
        query = query.filter(DocumentModel.status == search.status)
    
    if search.date_from:
        query = query.filter(DocumentModel.document_date >= search.date_from)
    
    if search.date_to:
        query = query.filter(DocumentModel.document_date <= search.date_to)
    
    if search.amount_min:
        query = query.filter(DocumentModel.amount_ttc >= search.amount_min)
    
    if search.amount_max:
        query = query.filter(DocumentModel.amount_ttc <= search.amount_max)
    
    if search.counterparty:
        query = query.filter(
            DocumentModel.counterparty_name.ilike(f"%{search.counterparty}%")
        )
    
    if search.category:
        query = query.filter(DocumentModel.category == search.category)
    
    if search.fiscal_year:
        query = query.filter(DocumentModel.fiscal_year == search.fiscal_year)
    
    if search.requires_action is not None:
        query = query.filter(DocumentModel.requires_action == search.requires_action)
    
    if search.is_validated is not None:
        query = query.filter(DocumentModel.is_validated == search.is_validated)
    
    # Text search in title and description
    if search.query:
        query = query.filter(
            or_(
                DocumentModel.title.ilike(f"%{search.query}%"),
                DocumentModel.description.ilike(f"%{search.query}%"),
                DocumentModel.notes.ilike(f"%{search.query}%")
            )
        )
    
    # Execute query
    documents = query.offset(search.offset).limit(search.limit).all()
    
    # Convert to schema with extracted data
    results = []
    for doc in documents:
        doc_dict = doc.__dict__.copy()
        if doc.ai_extracted_data:
            doc_dict['ai_extracted_data'] = json.loads(doc.ai_extracted_data)
        if doc.ai_suggestions:
            doc_dict['ai_suggestions'] = json.loads(doc.ai_suggestions)
        if doc.compliance_issues:
            doc_dict['compliance_issues'] = json.loads(doc.compliance_issues)
        
        results.append(DocumentWithExtractedData(**doc_dict))
    
    return results


@router.get("/statistics", response_model=DocumentStatistics)
def get_document_statistics(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get document statistics for the user or company.
    """
    base_query = db.query(DocumentModel).filter(
        DocumentModel.user_id == current_user.id
    )
    
    if company_id:
        base_query = base_query.filter(DocumentModel.company_id == company_id)
    
    # Total documents
    total_documents = base_query.count()
    
    # Documents by type
    docs_by_type = (
        base_query
        .with_entities(
            DocumentModel.document_type,
            func.count(DocumentModel.id)
        )
        .group_by(DocumentModel.document_type)
        .all()
    )
    documents_by_type = dict(docs_by_type)
    
    # Documents by status
    docs_by_status = (
        base_query
        .with_entities(
            DocumentModel.status,
            func.count(DocumentModel.id)
        )
        .group_by(DocumentModel.status)
        .all()
    )
    documents_by_status = dict(docs_by_status)
    
    # Financial totals
    financial_totals = (
        base_query
        .with_entities(
            func.sum(DocumentModel.amount_ttc),
            func.sum(DocumentModel.amount_tva)
        )
        .first()
    )
    total_amount_ttc = financial_totals[0] or 0
    total_vat = financial_totals[1] or 0
    
    # Documents requiring action
    documents_requiring_action = base_query.filter(
        DocumentModel.requires_action == True
    ).count()
    
    # Documents pending validation
    documents_pending_validation = base_query.filter(
        DocumentModel.is_validated == False,
        DocumentModel.is_processed == True
    ).count()
    
    # Average processing confidence
    avg_confidence = (
        base_query
        .filter(DocumentModel.ai_confidence_score.isnot(None))
        .with_entities(func.avg(DocumentModel.ai_confidence_score))
        .scalar()
    ) or 0
    
    # Documents processed this month
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0)
    documents_processed_this_month = base_query.filter(
        DocumentModel.processed_at >= current_month_start
    ).count()
    
    # Storage statistics
    storage_stats = storage_service.get_storage_stats(current_user.id)
    
    return DocumentStatistics(
        total_documents=total_documents,
        documents_by_type=documents_by_type,
        documents_by_status=documents_by_status,
        total_amount_ttc=total_amount_ttc,
        total_vat=total_vat,
        documents_requiring_action=documents_requiring_action,
        documents_pending_validation=documents_pending_validation,
        average_processing_confidence=avg_confidence,
        documents_processed_this_month=documents_processed_this_month,
        storage_used_mb=storage_stats['total_size_mb']
    )


@router.get("/{document_id}", response_model=DocumentWithExtractedData)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get a specific document by ID.
    """
    document = (
        db.query(DocumentModel)
        .filter(
            DocumentModel.id == document_id,
            DocumentModel.user_id == current_user.id
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Convert to schema with extracted data
    doc_dict = document.__dict__.copy()
    if document.ai_extracted_data:
        doc_dict['ai_extracted_data'] = json.loads(document.ai_extracted_data)
    if document.ai_suggestions:
        doc_dict['ai_suggestions'] = json.loads(document.ai_suggestions)
    if document.compliance_issues:
        doc_dict['compliance_issues'] = json.loads(document.compliance_issues)
    
    return DocumentWithExtractedData(**doc_dict)


@router.put("/{document_id}", response_model=DocumentSchema)
def update_document(
    *,
    db: Session = Depends(get_db),
    document_id: int,
    document_update: DocumentUpdate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update document metadata.
    """
    document = (
        db.query(DocumentModel)
        .filter(
            DocumentModel.id == document_id,
            DocumentModel.user_id == current_user.id
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update fields
    update_data = document_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)
    
    db.commit()
    db.refresh(document)
    
    return document


@router.post("/{document_id}/validate")
def validate_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Mark a document as validated.
    """
    document = (
        db.query(DocumentModel)
        .filter(
            DocumentModel.id == document_id,
            DocumentModel.user_id == current_user.id
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    document.is_validated = True
    document.validated_at = datetime.utcnow()
    document.status = "validated"
    db.commit()
    
    return {"message": "Document validated successfully"}


@router.post("/{document_id}/process", response_model=DocumentProcessingResult)
async def process_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Process or reprocess a document with AI.
    """
    document = (
        db.query(DocumentModel)
        .filter(
            DocumentModel.id == document_id,
            DocumentModel.user_id == current_user.id
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get file content
    file_content = await storage_service.get_file(document.file_path)
    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found in storage"
        )
    
    # Process with AI
    processor = AIDocumentProcessor()
    processing_result = await processor.process_document(
        file_content,
        document.file_type,
        document.document_type
    )
    
    # Update document with results
    document.ai_extracted_data = json.dumps(processing_result['extracted_data'])
    document.ai_confidence_score = processing_result['confidence_score']
    document.ai_suggestions = json.dumps(processing_result['suggestions'])
    document.is_processed = True
    document.processed_at = datetime.utcnow()
    document.status = "processed"
    
    # Update financial data
    if 'amount_ttc' in processing_result['extracted_data']:
        document.amount_ttc = processing_result['extracted_data']['amount_ttc']
    if 'amount_ht' in processing_result['extracted_data']:
        document.amount_ht = processing_result['extracted_data']['amount_ht']
    if 'amount_tva' in processing_result['extracted_data']:
        document.amount_tva = processing_result['extracted_data']['amount_tva']
    
    db.commit()
    
    return DocumentProcessingResult(
        document_id=document_id,
        status="success",
        extracted_data=processing_result['extracted_data'],
        confidence_score=processing_result['confidence_score'],
        document_type_detected=processing_result['document_type_detected'],
        amounts_detected=processing_result.get('amounts_detected'),
        dates_detected=processing_result.get('dates_detected'),
        entities_detected=processing_result.get('entities_detected'),
        suggestions=processing_result['suggestions'],
        warnings=processing_result.get('warnings'),
        processing_time_ms=processing_result['processing_time_ms']
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Delete a document and its file.
    """
    document = (
        db.query(DocumentModel)
        .filter(
            DocumentModel.id == document_id,
            DocumentModel.user_id == current_user.id
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete file from storage
    if document.file_path:
        await storage_service.delete_file(document.file_path)
    
    # Delete database record
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}