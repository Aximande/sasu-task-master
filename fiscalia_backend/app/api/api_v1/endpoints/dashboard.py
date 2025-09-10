"""
Dashboard and statistics endpoints.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.api import deps
from app.db.dependencies import get_db
from app.models.user import User
from app.models.company import Company
from app.models.tax_calculation import TaxCalculation
from app.models.document import Document
from app.services.ai_service import AITaxAssistant

router = APIRouter()


@router.get("/overview")
def get_dashboard_overview(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard overview.
    """
    # Base queries
    company_query = db.query(Company).filter(Company.user_id == current_user.id)
    tax_query = db.query(TaxCalculation).filter(TaxCalculation.user_id == current_user.id)
    doc_query = db.query(Document).filter(Document.user_id == current_user.id)
    
    if company_id:
        # Verify ownership
        company = company_query.filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        tax_query = tax_query.filter(TaxCalculation.company_id == company_id)
        doc_query = doc_query.filter(Document.company_id == company_id)
    
    # User info
    user_info = {
        'full_name': current_user.full_name,
        'email': current_user.email,
        'subscription_plan': current_user.subscription_plan,
        'companies_count': company_query.count()
    }
    
    # Company info (if specific company selected)
    company_info = None
    if company_id and company:
        company_info = {
            'id': company.id,
            'name': company.name,
            'siren': company.siren,
            'fiscal_year_start': company.fiscal_year_start,
            'fiscal_year_end': company.fiscal_year_end,
            'is_active': company.is_active
        }
    
    # Tax calculations summary
    recent_calculations = tax_query.order_by(
        TaxCalculation.created_at.desc()
    ).limit(5).all()
    
    tax_summary = {
        'total_calculations': tax_query.count(),
        'recent_calculations': [
            {
                'id': calc.id,
                'type': calc.calculation_type,
                'date': calc.created_at.isoformat(),
                'net_income': calc.net_income_after_tax,
                'total_taxes': calc.total_taxes,
                'effective_rate': calc.effective_tax_rate
            }
            for calc in recent_calculations
        ]
    }
    
    # Documents summary
    doc_summary = {
        'total_documents': doc_query.count(),
        'pending_validation': doc_query.filter(
            Document.is_validated == False,
            Document.is_processed == True
        ).count(),
        'requiring_action': doc_query.filter(
            Document.requires_action == True
        ).count()
    }
    
    # Financial metrics (last 12 months)
    twelve_months_ago = datetime.now() - timedelta(days=365)
    
    financial_metrics = tax_query.filter(
        TaxCalculation.created_at >= twelve_months_ago
    ).with_entities(
        func.sum(TaxCalculation.revenue).label('total_revenue'),
        func.sum(TaxCalculation.expenses).label('total_expenses'),
        func.sum(TaxCalculation.total_taxes).label('total_taxes_paid'),
        func.avg(TaxCalculation.effective_tax_rate).label('avg_tax_rate')
    ).first()
    
    metrics = {
        'total_revenue': financial_metrics.total_revenue or 0,
        'total_expenses': financial_metrics.total_expenses or 0,
        'total_taxes_paid': financial_metrics.total_taxes_paid or 0,
        'average_tax_rate': financial_metrics.avg_tax_rate or 0
    }
    
    return {
        'user': user_info,
        'company': company_info,
        'tax_summary': tax_summary,
        'document_summary': doc_summary,
        'financial_metrics': metrics,
        'timestamp': datetime.utcnow().isoformat()
    }


@router.get("/tax-trends")
def get_tax_trends(
    company_id: Optional[int] = None,
    period: str = "monthly",  # monthly, quarterly, yearly
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Dict[str, Any]:
    """
    Get tax trends over time.
    """
    query = db.query(TaxCalculation).filter(
        TaxCalculation.user_id == current_user.id
    )
    
    if company_id:
        query = query.filter(TaxCalculation.company_id == company_id)
    
    # Get calculations ordered by date
    calculations = query.order_by(
        TaxCalculation.created_at.desc()
    ).limit(limit * 3).all()  # Get more for grouping
    
    # Group by period
    trends = []
    if period == "monthly":
        grouped = {}
        for calc in calculations:
            month_key = calc.created_at.strftime("%Y-%m")
            if month_key not in grouped:
                grouped[month_key] = []
            grouped[month_key].append(calc)
        
        for month, calcs in sorted(grouped.items())[:limit]:
            trends.append({
                'period': month,
                'calculations_count': len(calcs),
                'total_revenue': sum(c.revenue for c in calcs),
                'total_taxes': sum(c.total_taxes for c in calcs),
                'avg_tax_rate': sum(c.effective_tax_rate for c in calcs) / len(calcs)
            })
    
    return {
        'period_type': period,
        'trends': trends
    }


@router.get("/optimization-opportunities")
async def get_optimization_opportunities(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Dict[str, Any]:
    """
    Get AI-powered tax optimization opportunities.
    """
    # Verify company ownership
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
    
    # Get recent calculations
    recent_calculations = (
        db.query(TaxCalculation)
        .filter(
            TaxCalculation.company_id == company_id,
            TaxCalculation.user_id == current_user.id
        )
        .order_by(TaxCalculation.created_at.desc())
        .limit(10)
        .all()
    )
    
    # Prepare data for AI analysis
    company_data = {
        'name': company.name,
        'legal_form': company.legal_form,
        'president_remuneration_type': company.president_remuneration_type,
        'corporate_tax_regime': company.corporate_tax_regime,
        'vat_regime': company.vat_regime
    }
    
    calculations_data = [
        {
            'date': calc.created_at.isoformat(),
            'gross_salary': calc.gross_salary,
            'dividends': calc.dividends,
            'revenue': calc.revenue,
            'expenses': calc.expenses,
            'total_taxes': calc.total_taxes,
            'effective_tax_rate': calc.effective_tax_rate
        }
        for calc in recent_calculations
    ]
    
    # Get AI analysis
    assistant = AITaxAssistant()
    analysis = await assistant.analyze_tax_situation(company_data, calculations_data)
    
    # Calculate potential savings
    if recent_calculations:
        latest = recent_calculations[0]
        potential_savings = latest.total_taxes * 0.15  # Estimate 15% savings potential
    else:
        potential_savings = 0
    
    return {
        'company_id': company_id,
        'analysis': analysis,
        'potential_annual_savings': potential_savings,
        'recommendations_count': len(analysis['opportunities']),
        'health_score': analysis['overall_score']
    }


@router.get("/activity-feed")
def get_activity_feed(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> List[Dict[str, Any]]:
    """
    Get recent activity feed.
    """
    activities = []
    
    # Recent tax calculations
    recent_calcs = (
        db.query(TaxCalculation)
        .filter(TaxCalculation.user_id == current_user.id)
        .order_by(TaxCalculation.created_at.desc())
        .limit(limit // 3)
        .all()
    )
    
    for calc in recent_calcs:
        activities.append({
            'type': 'tax_calculation',
            'timestamp': calc.created_at.isoformat(),
            'description': f"Calcul fiscal {calc.calculation_type}",
            'details': {
                'id': calc.id,
                'net_income': calc.net_income_after_tax,
                'tax_rate': calc.effective_tax_rate
            }
        })
    
    # Recent documents
    recent_docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .limit(limit // 3)
        .all()
    )
    
    for doc in recent_docs:
        activities.append({
            'type': 'document_upload',
            'timestamp': doc.created_at.isoformat(),
            'description': f"Document ajouté: {doc.title}",
            'details': {
                'id': doc.id,
                'document_type': doc.document_type,
                'status': doc.status
            }
        })
    
    # Recent company updates
    recent_companies = (
        db.query(Company)
        .filter(Company.user_id == current_user.id)
        .order_by(Company.updated_at.desc())
        .limit(limit // 3)
        .all()
    )
    
    for comp in recent_companies:
        activities.append({
            'type': 'company_update',
            'timestamp': comp.updated_at.isoformat(),
            'description': f"Société mise à jour: {comp.name}",
            'details': {
                'id': comp.id,
                'siren': comp.siren
            }
        })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return activities[:limit]


@router.get("/quick-stats")
def get_quick_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Dict[str, Any]:
    """
    Get quick statistics for header/sidebar display.
    """
    # Current month dates
    now = datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0)
    
    # This month's calculations
    month_calculations = (
        db.query(TaxCalculation)
        .filter(
            TaxCalculation.user_id == current_user.id,
            TaxCalculation.created_at >= month_start
        )
        .count()
    )
    
    # Pending tasks
    pending_documents = (
        db.query(Document)
        .filter(
            Document.user_id == current_user.id,
            Document.requires_action == True
        )
        .count()
    )
    
    # Active companies
    active_companies = (
        db.query(Company)
        .filter(
            Company.user_id == current_user.id,
            Company.is_active == True
        )
        .count()
    )
    
    # Latest tax rate
    latest_calc = (
        db.query(TaxCalculation)
        .filter(TaxCalculation.user_id == current_user.id)
        .order_by(TaxCalculation.created_at.desc())
        .first()
    )
    
    latest_tax_rate = latest_calc.effective_tax_rate if latest_calc else 0
    
    return {
        'month_calculations': month_calculations,
        'pending_tasks': pending_documents,
        'active_companies': active_companies,
        'latest_tax_rate': round(latest_tax_rate * 100, 1),  # As percentage
        'subscription_plan': current_user.subscription_plan
    }