"""
Qonto banking integration endpoints.
"""
import os
from typing import Any, Dict, List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import structlog

from app.api import deps
from app.db.dependencies import get_db
from app.services.qonto_service import QontoService
from app.core.timezone import now_paris, get_application_current_date

logger = structlog.get_logger()

router = APIRouter()


@router.get("/transactions", summary="Get transactions from Qonto")
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Any = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get transactions from Qonto via Google Sheets integration.
    
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
    """
    try:
        qonto_service = QontoService()
        
        # Parse dates if provided
        start_dt = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else None
        end_dt = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else None
        
        # Get transactions from service
        transactions = await qonto_service.fetch_transactions_from_sheets(start_date=start_dt, end_date=end_dt)
        
        logger.info(
            "Retrieved Qonto transactions",
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date,
            transaction_count=len(transactions)
        )
        
        return {"transactions": transactions}
        
    except Exception as e:
        logger.error(
            "Failed to get Qonto transactions",
            user_id=current_user.id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Failed to retrieve transactions: {str(e)}")


@router.get("/cash-flow", summary="Get cash flow analysis")
async def get_cash_flow(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Any = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get cash flow analysis from Qonto data.
    """
    try:
        qonto_service = QontoService()
        
        # Parse dates if provided
        start_dt = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else None
        end_dt = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else None
        
        # Get cash flow analysis - pass dates directly
        cash_flow = await qonto_service.analyze_cash_flow(start_date=start_dt or date.today().replace(day=1), end_date=end_dt or date.today())
        
        logger.info(
            "Retrieved cash flow analysis",
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        return cash_flow
        
    except Exception as e:
        logger.error(
            "Failed to get cash flow analysis",
            user_id=current_user.id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Failed to retrieve cash flow: {str(e)}")


@router.get("/expense-report", summary="Get expense report")
async def get_expense_report(
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    current_user: Any = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get categorized expense report from Qonto data.
    """
    try:
        qonto_service = QontoService()
        
        # Get expense report - needs company_id, using user's first company for now
        # TODO: Get from user's companies or pass as parameter
        company_id = 1  # Default for now
        report = await qonto_service.generate_expense_report(company_id=company_id, year=year, quarter=quarter)
        
        logger.info(
            "Retrieved expense report",
            user_id=current_user.id,
            year=year,
            quarter=quarter
        )
        
        return report
        
    except Exception as e:
        logger.error(
            "Failed to get expense report",
            user_id=current_user.id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Failed to retrieve expense report: {str(e)}")


@router.get("/anomalies", summary="Get transaction anomalies")
async def get_anomalies(
    current_user: Any = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detected transaction anomalies from Qonto data.
    """
    try:
        qonto_service = QontoService()
        
        # Get transactions first
        transactions = await qonto_service.fetch_transactions_from_sheets()
        
        # Get anomalies - pass transactions parameter
        anomalies = await qonto_service.detect_anomalies(transactions)
        
        logger.info(
            "Retrieved transaction anomalies",
            user_id=current_user.id,
            anomaly_count=len(anomalies)
        )
        
        return {"anomalies": anomalies}
        
    except Exception as e:
        logger.error(
            "Failed to get transaction anomalies",
            user_id=current_user.id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Failed to retrieve anomalies: {str(e)}")


@router.get("/predictions", summary="Get expense predictions")
async def get_predictions(
    months_ahead: int = 3,
    current_user: Any = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get expense predictions based on historical Qonto data.
    """
    try:
        qonto_service = QontoService()
        
        # Get predictions - only pass months_ahead
        predictions = await qonto_service.predict_future_expenses(months_ahead=months_ahead)
        
        logger.info(
            "Retrieved expense predictions",
            user_id=current_user.id,
            months_ahead=months_ahead
        )
        
        return predictions
        
    except Exception as e:
        logger.error(
            "Failed to get expense predictions",
            user_id=current_user.id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Failed to retrieve predictions: {str(e)}")


@router.get("/test/google-sheets", summary="Test Google Sheets integration (no auth)")
async def test_google_sheets() -> Dict[str, Any]:
    """
    Test endpoint to verify Google Sheets integration without authentication.
    """
    try:
        qonto_service = QontoService()
        
        # Simple test first
        transactions = await qonto_service.fetch_transactions_from_sheets()
        
        if not transactions:
            return {"error": "No transactions found", "status": "failed"}
        
        # Return basic info only
        return {
            "status": "success",
            "total_transactions": len(transactions),
            "sample_transaction": {
                "counterparty": transactions[-1].get('counterparty name', 'N/A'),
                "amount": transactions[-1].get('amount', 'N/A'),
                "date": transactions[-1].get('emitted at', 'N/A')[:10] if transactions[-1].get('emitted at') else 'N/A',
                "side": transactions[-1].get('side', 'N/A')
            } if transactions else None,
            "application_date": get_application_current_date().strftime('%Y-%m-%d'),
            "generated_at": now_paris().isoformat(),
            "source": "google_sheets"
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Test Google Sheets failed: {str(e)}")
        return {"error": str(e), "traceback": error_details, "status": "failed"}


@router.get("/transactions-paginated", summary="Get paginated transactions from Google Sheets")
async def get_paginated_transactions(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Number of transactions per page"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    status: Optional[str] = Query("completed", description="Transaction status filter")
) -> Dict[str, Any]:
    """
    Get paginated transactions with optional date filtering.
    """
    try:
        qonto_service = QontoService()
        
        # Parse date filters
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return {"error": "Invalid start_date format. Use YYYY-MM-DD", "status": "failed"}
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return {"error": "Invalid end_date format. Use YYYY-MM-DD", "status": "failed"}
        
        # Get all transactions with filters
        all_transactions = await qonto_service.fetch_transactions_from_sheets(
            start_date=start_date_obj,
            end_date=end_date_obj,
            status_filter=status
        )
        
        if not all_transactions:
            return {
                "status": "success",
                "transactions": [],
                "total_count": 0,
                "page": page,
                "limit": limit,
                "total_pages": 0
            }
        
        # Sort by date (most recent first)
        all_transactions.sort(
            key=lambda x: x.get('settled at_parsed') or x.get('emitted at_parsed') or date.min,
            reverse=True
        )
        
        # Calculate pagination
        total_count = len(all_transactions)
        total_pages = (total_count + limit - 1) // limit  # Ceiling division
        start_index = (page - 1) * limit
        end_index = start_index + limit
        
        # Get page transactions
        page_transactions = all_transactions[start_index:end_index]
        
        return {
            "status": "success",
            "transactions": page_transactions,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "status": status
            }
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Paginated transactions failed: {str(e)}")
        return {"error": str(e), "traceback": error_details, "status": "failed"}


@router.get("/real-dashboard", summary="Complete dashboard with real Google Sheets data (no auth)")
async def get_real_dashboard() -> Dict[str, Any]:
    """
    Get complete dashboard data using real Google Sheets data.
    """
    try:
        qonto_service = QontoService()
        
        # Get all transactions
        all_transactions = await qonto_service.fetch_transactions_from_sheets()
        
        if not all_transactions:
            return {"error": "No transactions found", "status": "failed"}
        
        # Get current month data
        current_date = get_application_current_date()
        start_of_month = current_date.replace(day=1)
        
        # Get cash flow for current month (September 2025)
        cash_flow = await qonto_service.analyze_cash_flow(
            start_of_month.date(), 
            current_date.date()
        )
        
        # Get expense report for Q3 2025
        expense_report = await qonto_service.generate_expense_report(
            company_id=1,
            year=2025,
            quarter=3
        )
        
        # Get all completed transactions (not just last 20)
        recent_transactions = [
            t for t in all_transactions 
            if t.get('status') == 'completed'
        ]
        
        # Sort by date (most recent first)
        recent_transactions.sort(
            key=lambda x: x.get('settled at_parsed') or x.get('emitted at_parsed') or date.min,
            reverse=True
        )
        
        # Calculate some real stats
        completed_transactions = [t for t in all_transactions if t.get('status') == 'completed']
        
        # Calculate revenue and expenses for 2025 using side field
        total_revenue_2025 = 0
        total_expenses_2025 = 0
        
        for t in completed_transactions:
            fiscal_year = t.get('fiscal_year')
            if fiscal_year != 2025:
                continue
                
            amount = t.get('amount_parsed', 0)
            side = t.get('side', '')
            
            if side == 'credit':  # Revenue
                total_revenue_2025 += abs(amount)
            elif side == 'debit':  # Expense
                total_expenses_2025 += abs(amount)
        
        # Count anomalies (large transactions)
        anomaly_count = len([
            t for t in completed_transactions 
            if abs(t.get('amount_parsed', 0)) > 500  # Transactions > 500€
        ])
        
        return {
            "status": "success",
            "dashboard_data": {
                "kpis": {
                    "total_revenue_2025": round(total_revenue_2025, 2),
                    "total_expenses_2025": round(total_expenses_2025, 2),
                    "net_cash_flow": round(total_revenue_2025 - total_expenses_2025, 2),
                    "anomaly_count": anomaly_count,
                    "burn_rate": round(cash_flow.get('burn_rate', 0), 2)
                },
                "current_month": cash_flow,
                "expense_report": expense_report,
                "recent_transactions": recent_transactions,
                "all_transactions": recent_transactions,  # All completed transactions for pagination
                "total_transactions": len(all_transactions),
                "completed_transactions": len(completed_transactions)
            },
            "application_date": current_date.strftime('%Y-%m-%d'),
            "generated_at": now_paris().isoformat(),
            "source": "google_sheets"
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Real dashboard failed: {str(e)}")
        return {"error": str(e), "traceback": error_details, "status": "failed"}

