"""
Tax calculation service for French SASU companies.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import math

from app.core.config import settings


class FrenchTaxCalculator:
    """
    Calculator for French SASU tax calculations.
    Based on 2024 tax rates and regulations.
    """
    
    def __init__(self):
        # Social charges rates for SASU president (2024)
        self.social_charges_rates = {
            'salary': {
                'employer': 0.42,  # ~42% employer charges
                'employee': 0.22,  # ~22% employee charges
            },
            'dividends': {
                'social': 0.172,  # 17.2% social charges on dividends
                'pfu': 0.128,    # 12.8% flat tax (PFU)
            }
        }
        
        # Corporate tax rates (IS) 2024
        self.corporate_tax_rates = [
            (42500, 0.15),   # 15% up to 42,500€
            (float('inf'), 0.25)  # 25% above
        ]
        
        # Income tax brackets (IR) 2024
        self.income_tax_brackets = [
            (11294, 0),      # 0% up to 11,294€
            (28797, 0.11),   # 11% from 11,294€ to 28,797€
            (82341, 0.30),   # 30% from 28,797€ to 82,341€
            (177106, 0.41),  # 41% from 82,341€ to 177,106€
            (float('inf'), 0.45)  # 45% above 177,106€
        ]
        
        # VAT rates
        self.vat_rates = {
            'standard': 0.20,
            'intermediate': 0.10,
            'reduced': 0.055,
            'super_reduced': 0.021
        }
        
        # Other constants
        self.smic_annual = settings.SMIC_HOURLY * 35 * 52
        self.pass_annual = settings.PASS_ANNUAL
    
    def calculate_social_charges_on_salary(self, gross_salary: float) -> Dict[str, float]:
        """
        Calculate social charges on salary for SASU president.
        """
        employer_charges = gross_salary * self.social_charges_rates['salary']['employer']
        employee_charges = gross_salary * self.social_charges_rates['salary']['employee']
        
        net_salary = gross_salary - employee_charges
        total_cost = gross_salary + employer_charges
        
        return {
            'gross_salary': gross_salary,
            'employer_charges': employer_charges,
            'employee_charges': employee_charges,
            'total_social_charges': employer_charges + employee_charges,
            'net_salary': net_salary,
            'total_cost_to_company': total_cost
        }
    
    def calculate_corporate_tax(self, profit_before_tax: float) -> float:
        """
        Calculate corporate tax (IS) based on profit.
        """
        if profit_before_tax <= 0:
            return 0
        
        tax = 0
        remaining_profit = profit_before_tax
        
        for threshold, rate in self.corporate_tax_rates:
            if remaining_profit <= 0:
                break
            
            taxable_amount = min(remaining_profit, threshold)
            tax += taxable_amount * rate
            remaining_profit -= taxable_amount
            
            if threshold == self.corporate_tax_rates[0][0]:
                remaining_profit = profit_before_tax - threshold if profit_before_tax > threshold else 0
        
        return tax
    
    def calculate_income_tax(self, taxable_income: float, parts: float = 1.0) -> float:
        """
        Calculate income tax (IR) using French progressive brackets.
        
        Args:
            taxable_income: Annual taxable income
            parts: Number of tax parts (quotient familial)
        """
        if taxable_income <= 0:
            return 0
        
        # Apply quotient familial
        income_per_part = taxable_income / parts
        
        tax_per_part = 0
        for i, (threshold, rate) in enumerate(self.income_tax_brackets):
            if i == 0:
                # First bracket
                if income_per_part <= threshold:
                    tax_per_part += income_per_part * rate
                    break
                else:
                    tax_per_part += threshold * rate
            else:
                # Subsequent brackets
                prev_threshold = self.income_tax_brackets[i-1][0]
                if income_per_part <= threshold:
                    tax_per_part += (income_per_part - prev_threshold) * rate
                    break
                else:
                    tax_per_part += (threshold - prev_threshold) * rate
        
        return tax_per_part * parts
    
    def calculate_dividends_taxation(self, dividends: float) -> Dict[str, float]:
        """
        Calculate taxation on dividends with PFU (Prélèvement Forfaitaire Unique).
        """
        if dividends <= 0:
            return {
                'dividends': 0,
                'social_charges': 0,
                'income_tax': 0,
                'total_tax': 0,
                'net_dividends': 0
            }
        
        # Social charges (17.2%)
        social_charges = dividends * self.social_charges_rates['dividends']['social']
        
        # Flat tax (12.8%)
        income_tax = dividends * self.social_charges_rates['dividends']['pfu']
        
        total_tax = social_charges + income_tax
        net_dividends = dividends - total_tax
        
        return {
            'dividends': dividends,
            'social_charges': social_charges,
            'income_tax': income_tax,
            'total_tax': total_tax,
            'net_dividends': net_dividends,
            'effective_rate': total_tax / dividends if dividends > 0 else 0
        }
    
    def calculate_vat(self, revenue: float, expenses: float, 
                     vat_rate: float = 0.20) -> Dict[str, float]:
        """
        Calculate VAT to pay.
        """
        vat_collected = revenue * vat_rate
        vat_deductible = expenses * vat_rate
        vat_to_pay = max(0, vat_collected - vat_deductible)
        
        return {
            'vat_collected': vat_collected,
            'vat_deductible': vat_deductible,
            'vat_to_pay': vat_to_pay,
            'vat_rate': vat_rate
        }
    
    def calculate_complete_taxation(
        self,
        gross_salary: float,
        dividends: float,
        revenue: float,
        expenses: float,
        vat_rate: float = 0.20
    ) -> Dict[str, Any]:
        """
        Complete tax calculation for SASU.
        """
        # Calculate social charges on salary
        salary_charges = self.calculate_social_charges_on_salary(gross_salary)
        
        # Calculate profit before tax
        total_salary_cost = salary_charges['total_cost_to_company']
        profit_before_tax = revenue - expenses - total_salary_cost
        
        # Calculate corporate tax
        corporate_tax = self.calculate_corporate_tax(profit_before_tax)
        profit_after_tax = profit_before_tax - corporate_tax
        
        # Dividends cannot exceed profit after tax
        actual_dividends = min(dividends, max(0, profit_after_tax))
        
        # Calculate dividend taxation
        dividend_tax = self.calculate_dividends_taxation(actual_dividends)
        
        # Calculate income tax on salary
        taxable_salary = salary_charges['net_salary'] * 0.9  # 10% deduction
        income_tax_salary = self.calculate_income_tax(taxable_salary)
        
        # Calculate VAT
        vat = self.calculate_vat(revenue, expenses, vat_rate)
        
        # Total calculations
        total_social_charges = salary_charges['total_social_charges'] + dividend_tax['social_charges']
        total_income_tax = income_tax_salary + dividend_tax['income_tax']
        total_taxes = (
            salary_charges['total_social_charges'] +
            corporate_tax +
            dividend_tax['total_tax'] +
            income_tax_salary +
            vat['vat_to_pay']
        )
        
        net_income = (
            salary_charges['net_salary'] - income_tax_salary +
            dividend_tax['net_dividends']
        )
        
        effective_tax_rate = total_taxes / revenue if revenue > 0 else 0
        
        return {
            'input': {
                'gross_salary': gross_salary,
                'dividends': dividends,
                'revenue': revenue,
                'expenses': expenses
            },
            'salary': salary_charges,
            'corporate': {
                'profit_before_tax': profit_before_tax,
                'corporate_tax': corporate_tax,
                'profit_after_tax': profit_after_tax,
                'available_for_dividends': max(0, profit_after_tax)
            },
            'dividends': dividend_tax,
            'income_tax': {
                'taxable_salary': taxable_salary,
                'tax_on_salary': income_tax_salary,
                'total': total_income_tax
            },
            'vat': vat,
            'summary': {
                'total_social_charges': total_social_charges,
                'total_corporate_tax': corporate_tax,
                'total_income_tax': total_income_tax,
                'total_vat': vat['vat_to_pay'],
                'total_taxes': total_taxes,
                'net_income': net_income,
                'effective_tax_rate': effective_tax_rate
            }
        }
    
    def optimize_remuneration(
        self,
        target_net_income: float,
        revenue: float,
        expenses: float,
        constraints: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Optimize the mix between salary and dividends to minimize taxes.
        """
        if constraints is None:
            constraints = {}
        
        min_salary = constraints.get('min_salary', self.smic_annual)
        max_salary = constraints.get('max_salary', revenue * 0.8)
        
        best_salary = min_salary
        best_dividends = 0
        min_total_tax = float('inf')
        best_result = None
        
        # Test different salary levels
        salary_steps = 20
        for i in range(salary_steps + 1):
            test_salary = min_salary + (max_salary - min_salary) * i / salary_steps
            
            # Calculate available profit for dividends
            salary_result = self.calculate_social_charges_on_salary(test_salary)
            profit_before_tax = revenue - expenses - salary_result['total_cost_to_company']
            
            if profit_before_tax <= 0:
                continue
            
            corporate_tax = self.calculate_corporate_tax(profit_before_tax)
            available_for_dividends = profit_before_tax - corporate_tax
            
            if available_for_dividends <= 0:
                continue
            
            # Binary search for optimal dividends
            low, high = 0, available_for_dividends
            while high - low > 100:
                mid = (low + high) / 2
                result = self.calculate_complete_taxation(
                    test_salary, mid, revenue, expenses
                )
                
                if result['summary']['net_income'] < target_net_income:
                    low = mid
                else:
                    high = mid
            
            # Test this combination
            test_dividends = (low + high) / 2
            result = self.calculate_complete_taxation(
                test_salary, test_dividends, revenue, expenses
            )
            
            # Check if this is better
            if (abs(result['summary']['net_income'] - target_net_income) < 1000 and
                result['summary']['total_taxes'] < min_total_tax):
                best_salary = test_salary
                best_dividends = test_dividends
                min_total_tax = result['summary']['total_taxes']
                best_result = result
        
        if best_result is None:
            # Fallback to minimum salary if no solution found
            best_result = self.calculate_complete_taxation(
                min_salary, 0, revenue, expenses
            )
            best_salary = min_salary
            best_dividends = 0
        
        return {
            'optimal_gross_salary': best_salary,
            'optimal_dividends': best_dividends,
            'net_income_achieved': best_result['summary']['net_income'],
            'total_tax_burden': best_result['summary']['total_taxes'],
            'effective_tax_rate': best_result['summary']['effective_tax_rate'],
            'breakdown': best_result['summary'],
            'full_calculation': best_result
        }
    
    def generate_recommendations(self, calculation_result: Dict[str, Any]) -> List[str]:
        """
        Generate tax optimization recommendations based on calculation results.
        """
        recommendations = []
        
        salary = calculation_result['input']['gross_salary']
        dividends = calculation_result['input']['dividends']
        effective_rate = calculation_result['summary']['effective_tax_rate']
        
        # Salary optimization
        if salary < self.smic_annual:
            recommendations.append(
                f"⚠️ Le salaire est inférieur au SMIC annuel ({self.smic_annual}€). "
                "Considérez d'augmenter le salaire pour valider des trimestres de retraite."
            )
        elif salary > self.pass_annual * 4:
            recommendations.append(
                "💡 Le salaire dépasse 4 PASS. Les cotisations retraite au-delà ont un rendement décroissant."
            )
        
        # Dividend optimization
        if dividends > 0 and salary < self.pass_annual:
            recommendations.append(
                "💡 Augmenter le salaire jusqu'à 1 PASS pourrait optimiser les cotisations retraite."
            )
        
        # Tax rate analysis
        if effective_rate > 0.45:
            recommendations.append(
                "⚠️ Taux d'imposition effectif élevé (>45%). Explorez les dispositifs de défiscalisation."
            )
        
        # VAT optimization
        if 'vat' in calculation_result:
            vat_to_pay = calculation_result['vat']['vat_to_pay']
            if vat_to_pay > calculation_result['input']['revenue'] * 0.15:
                recommendations.append(
                    "💡 TVA à payer élevée. Vérifiez que toutes les dépenses déductibles sont comptabilisées."
                )
        
        # Profit utilization
        if 'corporate' in calculation_result:
            available = calculation_result['corporate'].get('available_for_dividends', 0)
            if available > dividends * 2:
                recommendations.append(
                    "💡 Profits importants non distribués. Considérez l'investissement ou la distribution."
                )
        
        return recommendations