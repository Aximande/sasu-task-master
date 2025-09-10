"""
URSSAF integration service for real-time social charges calculations.
"""
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime, date
import asyncio

from app.core.config import settings


class URSSAFService:
    """
    Service for integrating with URSSAF API and calculating social charges.
    Note: This is a mock implementation. Real URSSAF API integration would require
    official API credentials and endpoints.
    """
    
    def __init__(self):
        self.api_key = settings.URSSAF_API_KEY
        self.base_url = settings.URSSAF_API_URL
        self.timeout = httpx.Timeout(30.0)
        
        # 2024 URSSAF rates
        self.rates_2024 = {
            'maladie': {
                'rate': 0.13,
                'ceiling': None,
                'description': 'Assurance maladie-maternité'
            },
            'vieillesse_plafonnee': {
                'rate': 0.1745,  # 10.45% salarié + 6.90% employeur
                'ceiling': 43992,  # 1 PASS
                'description': 'Assurance vieillesse plafonnée'
            },
            'vieillesse_deplafonnee': {
                'rate': 0.023,  # 0.40% salarié + 1.90% employeur
                'ceiling': None,
                'description': 'Assurance vieillesse déplafonnée'
            },
            'allocations_familiales': {
                'rate': 0.0525,  # 5.25% ou 3.45% si salaire < 3.5 SMIC
                'ceiling': None,
                'description': 'Allocations familiales'
            },
            'accidents_travail': {
                'rate': 0.0242,  # Taux moyen
                'ceiling': None,
                'description': 'Accidents du travail'
            },
            'chomage': {
                'rate': 0.0405,  # Employeur uniquement
                'ceiling': 175968,  # 4 PASS
                'description': 'Assurance chômage'
            },
            'ags': {
                'rate': 0.0015,
                'ceiling': 175968,  # 4 PASS
                'description': 'AGS (garantie des salaires)'
            },
            'retraite_complementaire': {
                'tranche_1': {
                    'rate': 0.0787,  # 3.15% salarié + 4.72% employeur
                    'ceiling': 43992,  # 1 PASS
                },
                'tranche_2': {
                    'rate': 0.2159,  # 8.64% salarié + 12.95% employeur
                    'min': 43992,
                    'ceiling': 351936,  # 8 PASS
                }
            },
            'ceg': {
                'rate': 0.0214,  # 0.86% salarié + 1.29% employeur
                'ceiling': 351936,  # 8 PASS
                'description': 'Contribution d\'équilibre général'
            },
            'cet': {
                'rate': 0.0035,  # 0.14% salarié + 0.21% employeur
                'ceiling': 351936,  # 8 PASS
                'description': 'Contribution d\'équilibre technique'
            },
            'formation': {
                'rate': 0.0055,  # Pour entreprises < 11 salariés
                'ceiling': None,
                'description': 'Formation professionnelle'
            },
            'csa': {
                'rate': 0.003,  # Contribution solidarité autonomie
                'ceiling': None,
                'description': 'Contribution solidarité autonomie'
            }
        }
    
    async def calculate_social_charges(
        self,
        gross_salary: float,
        company_size: int = 1,
        sector: str = "general"
    ) -> Dict[str, Any]:
        """
        Calculate detailed social charges for a given gross salary.
        
        Args:
            gross_salary: Annual gross salary
            company_size: Number of employees
            sector: Business sector for specific rates
        
        Returns:
            Detailed breakdown of social charges
        """
        charges = {
            'employer': {},
            'employee': {},
            'total_employer': 0,
            'total_employee': 0,
            'total_charges': 0,
            'net_salary': 0,
            'total_cost': 0
        }
        
        # Calculate each type of charge
        for charge_type, params in self.rates_2024.items():
            if charge_type == 'retraite_complementaire':
                # Handle retirement tranches
                employer_amount = 0
                employee_amount = 0
                
                # Tranche 1
                t1 = params['tranche_1']
                base_t1 = min(gross_salary, t1['ceiling'])
                employer_amount += base_t1 * t1['rate'] * 0.6  # 60% employer
                employee_amount += base_t1 * t1['rate'] * 0.4  # 40% employee
                
                # Tranche 2
                if gross_salary > t1['ceiling']:
                    t2 = params['tranche_2']
                    base_t2 = min(gross_salary - t1['ceiling'], t2['ceiling'] - t1['ceiling'])
                    employer_amount += base_t2 * t2['rate'] * 0.6
                    employee_amount += base_t2 * t2['rate'] * 0.4
                
                charges['employer']['retraite_complementaire'] = employer_amount
                charges['employee']['retraite_complementaire'] = employee_amount
                
            else:
                if isinstance(params, dict) and 'rate' in params:
                    # Apply ceiling if exists
                    base = gross_salary
                    if params.get('ceiling'):
                        base = min(gross_salary, params['ceiling'])
                    
                    amount = base * params['rate']
                    
                    # Determine if charge is employer/employee/both
                    if charge_type in ['chomage', 'ags', 'accidents_travail', 
                                      'allocations_familiales', 'formation', 'csa']:
                        # Employer only
                        charges['employer'][charge_type] = amount
                    elif charge_type in ['maladie']:
                        # Mostly employer
                        charges['employer'][charge_type] = amount * 0.85
                        charges['employee'][charge_type] = amount * 0.15
                    else:
                        # Split between employer and employee
                        charges['employer'][charge_type] = amount * 0.6
                        charges['employee'][charge_type] = amount * 0.4
        
        # Calculate totals
        charges['total_employer'] = sum(charges['employer'].values())
        charges['total_employee'] = sum(charges['employee'].values())
        charges['total_charges'] = charges['total_employer'] + charges['total_employee']
        charges['net_salary'] = gross_salary - charges['total_employee']
        charges['total_cost'] = gross_salary + charges['total_employer']
        
        # Add effective rates
        charges['employer_rate'] = charges['total_employer'] / gross_salary if gross_salary > 0 else 0
        charges['employee_rate'] = charges['total_employee'] / gross_salary if gross_salary > 0 else 0
        
        return charges
    
    async def get_contribution_rates(
        self,
        date_reference: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Get current URSSAF contribution rates.
        
        Args:
            date_reference: Reference date for rates (default: current)
        
        Returns:
            Current contribution rates and thresholds
        """
        if not date_reference:
            date_reference = date.today()
        
        # This would normally call the URSSAF API
        # For now, return structured rates
        return {
            'reference_date': date_reference.isoformat(),
            'pass_annual': settings.PASS_ANNUAL,
            'smic_hourly': settings.SMIC_HOURLY,
            'smic_annual': settings.SMIC_HOURLY * 35 * 52,
            'rates': self.rates_2024,
            'updated_at': datetime.utcnow().isoformat()
        }
    
    async def verify_company_registration(
        self,
        siren: str
    ) -> Dict[str, Any]:
        """
        Verify company registration with URSSAF.
        
        Args:
            siren: Company SIREN number
        
        Returns:
            Company registration status and details
        """
        # Mock implementation - real would call URSSAF API
        if not siren or len(siren) != 9:
            return {
                'valid': False,
                'error': 'Invalid SIREN format'
            }
        
        # Simulate API response
        return {
            'valid': True,
            'siren': siren,
            'registration_date': '2022-01-15',
            'status': 'active',
            'urssaf_account': f'UR{siren[:6]}',
            'payment_status': 'up_to_date',
            'last_declaration': '2024-01-15'
        }
    
    async def calculate_quarterly_contributions(
        self,
        gross_salaries: List[float],
        quarter: int,
        year: int
    ) -> Dict[str, Any]:
        """
        Calculate quarterly URSSAF contributions.
        
        Args:
            gross_salaries: List of monthly gross salaries
            quarter: Quarter number (1-4)
            year: Year
        
        Returns:
            Quarterly contribution details
        """
        if len(gross_salaries) != 3:
            raise ValueError("Must provide exactly 3 monthly salaries")
        
        total_gross = sum(gross_salaries)
        charges = await self.calculate_social_charges(total_gross * 4)  # Annualize then divide
        
        quarterly_charges = {
            'quarter': f"Q{quarter} {year}",
            'total_gross_salaries': total_gross,
            'employer_contributions': charges['total_employer'] / 4,
            'employee_contributions': charges['total_employee'] / 4,
            'total_contributions': charges['total_charges'] / 4,
            'due_date': self._get_due_date(quarter, year),
            'breakdown': {
                'month_1': await self.calculate_social_charges(gross_salaries[0] * 12),
                'month_2': await self.calculate_social_charges(gross_salaries[1] * 12),
                'month_3': await self.calculate_social_charges(gross_salaries[2] * 12),
            }
        }
        
        return quarterly_charges
    
    def _get_due_date(self, quarter: int, year: int) -> str:
        """Get URSSAF payment due date for a quarter."""
        due_dates = {
            1: f"{year}-04-15",
            2: f"{year}-07-15",
            3: f"{year}-10-15",
            4: f"{year + 1}-01-15"
        }
        return due_dates.get(quarter, "")
    
    async def estimate_annual_contributions(
        self,
        estimated_revenue: float,
        estimated_salary: float,
        company_type: str = "SASU"
    ) -> Dict[str, Any]:
        """
        Estimate annual URSSAF contributions.
        
        Args:
            estimated_revenue: Estimated annual revenue
            estimated_salary: Estimated annual salary
            company_type: Type of company
        
        Returns:
            Annual contribution estimates
        """
        # Calculate social charges
        charges = await self.calculate_social_charges(estimated_salary)
        
        # Additional contributions based on revenue
        additional_contributions = {
            'cvae': 0,  # CVAE if revenue > 500k€
            'formation_taxe_apprentissage': 0,
            'effort_construction': 0
        }
        
        if estimated_revenue > 500000:
            additional_contributions['cvae'] = estimated_revenue * 0.0015
        
        if estimated_revenue > 250000:
            additional_contributions['formation_taxe_apprentissage'] = estimated_salary * 0.0068
        
        return {
            'estimated_revenue': estimated_revenue,
            'estimated_salary': estimated_salary,
            'social_charges': charges,
            'additional_contributions': additional_contributions,
            'total_annual_contributions': (
                charges['total_charges'] +
                sum(additional_contributions.values())
            ),
            'monthly_provision': (
                charges['total_charges'] +
                sum(additional_contributions.values())
            ) / 12
        }
    
    async def check_payment_schedule(
        self,
        siren: str,
        year: int
    ) -> Dict[str, Any]:
        """
        Check URSSAF payment schedule for a company.
        
        Args:
            siren: Company SIREN
            year: Year to check
        
        Returns:
            Payment schedule and status
        """
        # Mock implementation
        quarters = []
        for q in range(1, 5):
            quarters.append({
                'quarter': f"Q{q} {year}",
                'due_date': self._get_due_date(q, year),
                'amount_due': 5000.0 * q,  # Mock amount
                'status': 'paid' if q < 2 else 'pending',
                'paid_date': f"{year}-{q*3:02d}-10" if q < 2 else None
            })
        
        return {
            'siren': siren,
            'year': year,
            'payment_schedule': quarters,
            'total_due': sum(q['amount_due'] for q in quarters),
            'total_paid': sum(q['amount_due'] for q in quarters if q['status'] == 'paid'),
            'next_due_date': self._get_due_date(2, year),
            'payment_status': 'up_to_date'
        }


# Singleton instance
urssaf_service = URSSAFService()