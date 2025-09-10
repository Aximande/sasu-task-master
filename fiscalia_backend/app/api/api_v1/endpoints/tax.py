"""
Tax calculation endpoints.
"""
import json
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.dependencies import get_db
from app.models.user import User
from app.models.company import Company
from app.models.tax_calculation import TaxCalculation as TaxCalculationModel
from app.schemas.tax import (
    TaxCalculation as TaxCalculationSchema,
    TaxCalculationCreate,
    TaxCalculationRequest,
    TaxCalculationResult,
    TaxCalculationUpdate,
    TaxOptimizationRequest,
    TaxOptimizationResult
)
from app.services.tax_calculator import FrenchTaxCalculator

router = APIRouter()


@router.post("/calculate", response_model=TaxCalculationResult)
def calculate_taxes(
    *,
    db: Session = Depends(get_db),
    request: TaxCalculationRequest,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Calculate taxes for given parameters without saving.
    """
    # Verify company ownership if company_id provided
    if request.company_id:
        company = (
            db.query(Company)
            .filter(
                Company.id == request.company_id,
                Company.user_id == current_user.id
            )
            .first()
        )
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
    
    # Initialize calculator
    calculator = FrenchTaxCalculator()
    
    # Perform calculation
    result = calculator.calculate_complete_taxation(
        gross_salary=request.gross_salary,
        dividends=request.dividends,
        revenue=request.revenue,
        expenses=request.expenses
    )
    
    # Generate recommendations if requested
    recommendations = None
    if request.include_recommendations:
        recommendations = calculator.generate_recommendations(result)
    
    # Prepare response
    return TaxCalculationResult(
        gross_salary=request.gross_salary,
        dividends=request.dividends,
        revenue=request.revenue,
        expenses=request.expenses,
        profit_before_tax=result['corporate']['profit_before_tax'],
        
        net_salary=result['salary']['net_salary'],
        employer_social_charges=result['salary']['employer_charges'],
        employee_social_charges=result['salary']['employee_charges'],
        total_social_charges=result['summary']['total_social_charges'],
        
        corporate_tax=result['corporate']['corporate_tax'],
        income_tax=result['income_tax']['total'],
        dividend_tax=result['dividends']['total_tax'],
        vat_to_pay=result['vat']['vat_to_pay'],
        
        total_taxes=result['summary']['total_taxes'],
        net_income_after_tax=result['summary']['net_income'],
        effective_tax_rate=result['summary']['effective_tax_rate'],
        
        optimization_potential=0,  # Will be calculated if optimize=True
        calculation_details=result,
        recommendations=recommendations
    )


@router.post("/optimize", response_model=TaxOptimizationResult)
def optimize_taxes(
    *,
    db: Session = Depends(get_db),
    request: TaxOptimizationRequest,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Optimize salary/dividend mix for target net income.
    """
    # Verify company ownership
    company = (
        db.query(Company)
        .filter(
            Company.id == request.company_id,
            Company.user_id == current_user.id
        )
        .first()
    )
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Initialize calculator
    calculator = FrenchTaxCalculator()
    
    # Prepare constraints
    constraints = {}
    if request.min_salary is not None:
        constraints['min_salary'] = request.min_salary
    if request.max_salary is not None:
        constraints['max_salary'] = request.max_salary
    
    # Perform optimization
    result = calculator.optimize_remuneration(
        target_net_income=request.target_net_income,
        revenue=request.revenue,
        expenses=request.expenses,
        constraints=constraints
    )
    
    # Calculate savings vs alternatives
    all_salary = calculator.calculate_complete_taxation(
        gross_salary=request.target_net_income * 1.8,  # Rough estimate
        dividends=0,
        revenue=request.revenue,
        expenses=request.expenses
    )
    
    all_dividends = calculator.calculate_complete_taxation(
        gross_salary=calculator.smic_annual,
        dividends=request.target_net_income * 1.4,  # Rough estimate
        revenue=request.revenue,
        expenses=request.expenses
    )
    
    savings_vs_salary = all_salary['summary']['total_taxes'] - result['total_tax_burden']
    savings_vs_dividends = all_dividends['summary']['total_taxes'] - result['total_tax_burden']
    
    # Generate recommendations
    recommendations = [
        f"Salaire optimal: {result['optimal_gross_salary']:,.0f}€ brut annuel",
        f"Dividendes optimaux: {result['optimal_dividends']:,.0f}€",
        f"Économie vs tout en salaire: {savings_vs_salary:,.0f}€",
        f"Économie vs tout en dividendes: {savings_vs_dividends:,.0f}€"
    ]
    
    # Add warnings if needed
    warnings = []
    if result['optimal_gross_salary'] < calculator.smic_annual:
        warnings.append("Le salaire optimisé est inférieur au SMIC")
    
    return TaxOptimizationResult(
        optimal_gross_salary=result['optimal_gross_salary'],
        optimal_dividends=result['optimal_dividends'],
        net_income_achieved=result['net_income_achieved'],
        total_tax_burden=result['total_tax_burden'],
        effective_tax_rate=result['effective_tax_rate'],
        savings_vs_all_salary=max(0, savings_vs_salary),
        savings_vs_all_dividends=max(0, savings_vs_dividends),
        breakdown=result['breakdown'],
        recommendations=recommendations,
        warnings=warnings if warnings else None
    )


@router.post("/save", response_model=TaxCalculationSchema)
def save_calculation(
    *,
    db: Session = Depends(get_db),
    calculation: TaxCalculationCreate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Save a tax calculation for future reference.
    """
    # Verify company ownership if company_id provided
    if calculation.company_id:
        company = (
            db.query(Company)
            .filter(
                Company.id == calculation.company_id,
                Company.user_id == current_user.id
            )
            .first()
        )
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
    
    # Perform calculation
    calculator = FrenchTaxCalculator()
    result = calculator.calculate_complete_taxation(
        gross_salary=calculation.gross_salary,
        dividends=calculation.dividends,
        revenue=calculation.revenue,
        expenses=calculation.expenses
    )
    
    # Create database record
    db_calculation = TaxCalculationModel(
        user_id=current_user.id,
        company_id=calculation.company_id,
        calculation_type=calculation.calculation_type,
        tax_year=calculation.tax_year,
        period_type=calculation.period_type,
        period_start=calculation.period_start,
        period_end=calculation.period_end,
        
        gross_salary=calculation.gross_salary,
        net_salary=result['salary']['net_salary'],
        dividends=calculation.dividends,
        other_income=calculation.other_income,
        
        revenue=calculation.revenue,
        expenses=calculation.expenses,
        profit_before_tax=result['corporate']['profit_before_tax'],
        
        employer_social_charges=result['salary']['employer_charges'],
        employee_social_charges=result['salary']['employee_charges'],
        total_social_charges=result['summary']['total_social_charges'],
        
        corporate_tax=result['corporate']['corporate_tax'],
        income_tax=result['income_tax']['tax_on_salary'],
        dividend_tax=result['dividends']['total_tax'],
        vat_collected=result['vat']['vat_collected'],
        vat_deductible=result['vat']['vat_deductible'],
        vat_to_pay=result['vat']['vat_to_pay'],
        
        total_taxes=result['summary']['total_taxes'],
        net_income_after_tax=result['summary']['net_income'],
        effective_tax_rate=result['summary']['effective_tax_rate'],
        
        scenario_name=calculation.scenario_name,
        scenario_description=calculation.scenario_description,
        calculation_details=json.dumps(result),
        notes=calculation.notes,
        status="final"
    )
    
    db.add(db_calculation)
    db.commit()
    db.refresh(db_calculation)
    
    return db_calculation


@router.get("/", response_model=List[TaxCalculationSchema])
def get_calculations(
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get all tax calculations for the current user.
    """
    query = db.query(TaxCalculationModel).filter(
        TaxCalculationModel.user_id == current_user.id
    )
    
    if company_id:
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
        query = query.filter(TaxCalculationModel.company_id == company_id)
    
    calculations = query.offset(skip).limit(limit).all()
    return calculations


@router.get("/{calculation_id}", response_model=TaxCalculationSchema)
def get_calculation(
    calculation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get a specific tax calculation by ID.
    """
    calculation = (
        db.query(TaxCalculationModel)
        .filter(
            TaxCalculationModel.id == calculation_id,
            TaxCalculationModel.user_id == current_user.id
        )
        .first()
    )
    
    if not calculation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax calculation not found"
        )
    
    return calculation


@router.put("/{calculation_id}", response_model=TaxCalculationSchema)
def update_calculation(
    *,
    db: Session = Depends(get_db),
    calculation_id: int,
    update_data: TaxCalculationUpdate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update a tax calculation (metadata only).
    """
    calculation = (
        db.query(TaxCalculationModel)
        .filter(
            TaxCalculationModel.id == calculation_id,
            TaxCalculationModel.user_id == current_user.id
        )
        .first()
    )
    
    if not calculation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax calculation not found"
        )
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(calculation, field, value)
    
    db.commit()
    db.refresh(calculation)
    
    return calculation


@router.delete("/{calculation_id}")
def delete_calculation(
    calculation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Delete a tax calculation.
    """
    calculation = (
        db.query(TaxCalculationModel)
        .filter(
            TaxCalculationModel.id == calculation_id,
            TaxCalculationModel.user_id == current_user.id
        )
        .first()
    )
    
    if not calculation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax calculation not found"
        )
    
    db.delete(calculation)
    db.commit()
    
    return {"message": "Tax calculation deleted successfully"}