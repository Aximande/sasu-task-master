"""
Qonto bank integration service with Google Sheets sync.
"""
import os
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import httpx
from google.oauth2 import service_account
from googleapiclient.discovery import build
import pandas as pd

from app.core.config import settings


class QontoService:
    """
    Service for integrating with Qonto bank data via Google Sheets.
    Provides real-time transaction analysis and categorization.
    """
    
    def __init__(self):
        # Google Sheets configuration - exact Qonto Connect format
        self.sheets_id = os.getenv('QONTO_SHEETS_ID', '10u_3D39lHyeHAOkujcR5KEnxfermJhYw9BrQ6DEG3c8')
        self.sheets_range = 'Sync. transactions - Do not edit!A:U'  # All columns from Qonto sheet, correct tab name
        
        # Transaction categories for French accounting
        self.expense_categories = {
            'salaire': {
                'keywords': ['salaire', 'paie', 'remuneration', 'president'],
                'account': '641000',
                'description': 'Rémunérations du personnel'
            },
            'charges_sociales': {
                'keywords': ['urssaf', 'cotisation', 'retraite', 'mutuelle', 'prevoyance'],
                'account': '645000',
                'description': 'Charges de sécurité sociale'
            },
            'loyer': {
                'keywords': ['loyer', 'rent', 'bail', 'location bureau'],
                'account': '613200',
                'description': 'Locations immobilières'
            },
            'fournitures': {
                'keywords': ['fourniture', 'bureau', 'papeterie', 'materiel'],
                'account': '606400',
                'description': 'Fournitures administratives'
            },
            'services_externes': {
                'keywords': ['consultant', 'freelance', 'prestataire', 'sous-traitant'],
                'account': '604000',
                'description': 'Achats de prestations de services'
            },
            'logiciels': {
                'keywords': ['software', 'saas', 'abonnement', 'licence', 'cloud'],
                'account': '651100',
                'description': 'Redevances pour logiciels'
            },
            'telecom': {
                'keywords': ['telephone', 'internet', 'mobile', 'telecom', 'sfr', 'orange', 'free'],
                'account': '626000',
                'description': 'Frais postaux et télécommunications'
            },
            'deplacement': {
                'keywords': ['train', 'sncf', 'taxi', 'uber', 'essence', 'peage', 'parking'],
                'account': '625100',
                'description': 'Voyages et déplacements'
            },
            'restaurant': {
                'keywords': ['restaurant', 'repas', 'lunch', 'dejeuner', 'diner'],
                'account': '625700',
                'description': 'Réceptions'
            },
            'banque': {
                'keywords': ['qonto', 'frais bancaire', 'commission', 'virement'],
                'account': '627000',
                'description': 'Services bancaires'
            },
            'impots': {
                'keywords': ['impot', 'taxe', 'cfe', 'cvae', 'tva', 'tresor public'],
                'account': '635000',
                'description': 'Impôts et taxes'
            },
            'assurance': {
                'keywords': ['assurance', 'responsabilite', 'rc pro', 'multirisque'],
                'account': '616000',
                'description': 'Primes d\'assurance'
            },
            'marketing': {
                'keywords': ['publicite', 'marketing', 'google ads', 'facebook', 'linkedin'],
                'account': '623000',
                'description': 'Publicité et marketing'
            },
            'formation': {
                'keywords': ['formation', 'cours', 'training', 'certification'],
                'account': '633300',
                'description': 'Formation professionnelle'
            }
        }
        
        self.income_categories = {
            'ventes_services': {
                'keywords': ['virement', 'facture', 'paiement client', 'honoraire'],
                'account': '706000',
                'description': 'Prestations de services'
            },
            'subventions': {
                'keywords': ['subvention', 'aide', 'credit impot', 'remboursement'],
                'account': '740000',
                'description': 'Subventions d\'exploitation'
            },
            'autres_produits': {
                'keywords': ['remboursement', 'avoir'],
                'account': '758000',
                'description': 'Produits divers de gestion courante'
            }
        }
    
    def _authenticate_google_sheets(self):
        """Authenticate with Google Sheets API."""
        try:
            # Method 1: Service account credentials (recommended)
            credentials_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY', '')
            if credentials_path and os.path.exists(credentials_path):
                credentials = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
                )
                service = build('sheets', 'v4', credentials=credentials)
                return service.spreadsheets()
            
            # Method 2: API Key (if sheet is publicly readable)
            api_key = os.getenv('GOOGLE_SHEETS_API_KEY', '')
            if api_key:
                service = build('sheets', 'v4', developerKey=api_key)
                return service.spreadsheets()
            
            # Method 3: Try without authentication (for public sheets)
            # This will work if the sheet is shared publicly
            try:
                service = build('sheets', 'v4')
                # Test if we can access the sheet
                test = service.values().get(
                    spreadsheetId=self.sheets_id,
                    range='A1:A1'
                ).execute()
                return service.spreadsheets()
            except:
                pass
            
            print("No Google Sheets authentication configured. Using mock data.")
            return None
            
        except Exception as e:
            print(f"Google Sheets authentication failed: {e}")
            return None
    
    async def fetch_transactions_from_sheets(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status_filter: Optional[str] = 'completed'
    ) -> List[Dict[str, Any]]:
        """
        Fetch transactions from Qonto Google Sheets.
        
        Args:
            start_date: Filter transactions after this date
            end_date: Filter transactions before this date
            status_filter: Filter by status (completed, pending, etc.)
        
        Returns:
            List of transaction dictionaries with Qonto structure
        """
        try:
            sheets = self._authenticate_google_sheets()
            if not sheets:
                # Return mock data for development if no sheets access
                return self._get_mock_transactions()
            
            # Get data from sheet
            result = sheets.values().get(
                spreadsheetId=self.sheets_id,
                range=self.sheets_range
            ).execute()
            
            values = result.get('values', [])
            if not values or len(values) < 2:
                return []
            
            # Use actual headers from the sheet (first row)
            headers = values[0]
            transactions = []
            
            for row_idx, row in enumerate(values[1:], start=1):  # Skip header row
                if len(row) < 2:  # Skip empty rows
                    continue
                
                # Create transaction dict using actual headers
                transaction = {}
                for i, header in enumerate(headers):
                    if i < len(row):
                        transaction[header] = row[i]
                    else:
                        transaction[header] = None
                
                # Filter by status
                if status_filter and transaction.get('status') != status_filter:
                    continue
                
                # Parse dates - Qonto format: 2024-12-29T15:19:34.708Z
                for date_field in ['emitted at', 'settled at', 'updated at']:
                    if transaction.get(date_field):
                        transaction[f'{date_field}_parsed'] = self._parse_qonto_date(
                            transaction[date_field]
                        )
                
                # Use settled_at for date filtering
                transaction_date = transaction.get('settled at_parsed')
                
                # Apply date filters
                if start_date and transaction_date:
                    if transaction_date < start_date:
                        continue
                
                if end_date and transaction_date:
                    if transaction_date > end_date:
                        continue
                
                # Parse amounts - clean format from Qonto
                transaction['amount_parsed'] = self._parse_amount(
                    transaction.get('amount', '0')
                )
                transaction['local_amount_parsed'] = self._parse_amount(
                    transaction.get('local amount', '0')
                )
                transaction['vat_amount_parsed'] = self._parse_amount(
                    transaction.get('vat amount', '0')
                )
                
                # Also store as 'amount' for backward compatibility
                transaction['amount'] = transaction['amount_parsed']
                
                # Determine transaction direction
                transaction['is_income'] = transaction.get('side') == 'credit'
                transaction['is_expense'] = transaction.get('side') == 'debit'
                
                # Add fiscal year from emitted_at date
                emitted_date = transaction.get('emitted at_parsed')
                if emitted_date:
                    transaction['fiscal_year'] = emitted_date.year
                else:
                    transaction['fiscal_year'] = 2025  # Default
                
                transactions.append(transaction)
            
            return transactions
            
        except Exception as e:
            print(f"Error fetching from Google Sheets: {e}")
            return self._get_mock_transactions()
    
    def _parse_qonto_date(self, date_str: str) -> Optional[date]:
        """Parse Qonto date format (ISO 8601)."""
        try:
            # Qonto format: 2024-12-29T15:19:34.708Z
            if 'T' in date_str:
                date_part = date_str.split('T')[0]
                return datetime.strptime(date_part, '%Y-%m-%d').date()
            # Alternative format: 2025-01-01T02:24:00+01:00
            elif '+' in date_str or '-' in date_str[-6:]:
                date_part = date_str.split('T')[0]
                return datetime.strptime(date_part, '%Y-%m-%d').date()
            else:
                return self._parse_date(date_str)
        except:
            return None
    
    def _get_mock_transactions(self) -> List[Dict[str, Any]]:
        """Get mock transactions for development."""
        return [
            {
                'status': 'completed',
                'emitted_at': '2025-01-16T21:00:00Z',
                'settled_at': '2025-01-16T21:00:00Z',
                'counterparty_name': 'MINDSET TRADE',
                'operation_type': 'transfer',
                'category': 'other_expense',
                'side': 'debit',
                'amount': '1080',
                'currency': 'EUR',
                'local_amount': '1080',
                'local_currency': 'EUR',
                'vat_amount': '180',
                'vat_rate': '20',
                'amount_parsed': 1080.0,
                'is_expense': True,
                'is_income': False
            }
        ]
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse date from various formats."""
        try:
            # Try common date formats
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d']:
                try:
                    return datetime.strptime(date_str, fmt).date()
                except:
                    continue
            return None
        except:
            return None
    
    def _parse_amount(self, amount_str: str) -> float:
        """Parse amount from string."""
        try:
            # Remove currency symbols and spaces
            clean = amount_str.replace('€', '').replace(' ', '').replace(',', '.')
            return float(clean)
        except:
            return 0.0
    
    def categorize_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance Qonto transaction with French accounting categorization.
        
        Args:
            transaction: Qonto transaction data
            
        Returns:
            Transaction enhanced with accounting details
        """
        # Qonto already provides a category, but we enhance it
        qonto_category = transaction.get('category', '').lower()
        counterparty = transaction.get('counterparty_name', '').lower()
        operation_type = transaction.get('operation_type', '').lower()
        reference = transaction.get('reference', '').lower()
        internal_note = transaction.get('internal_note', '').lower()
        
        # Combine all text fields for analysis
        full_text = f"{counterparty} {reference} {internal_note} {qonto_category}"
        
        # Determine if income or expense from Qonto 'side' field
        is_income = transaction.get('side') == 'credit'
        is_expense = transaction.get('side') == 'debit'
        
        # Map Qonto categories to French accounting
        qonto_to_accounting = {
            'qonto_fee': 'banque',
            'fees': 'banque',
            'other_income': 'ventes_services',
            'other_expense': 'services_externes',
            'transport': 'deplacement',
            'marketing': 'marketing',
            'card': 'fournitures',  # Default for card payments
        }
        
        # Start with Qonto's category
        matched_category = qonto_to_accounting.get(qonto_category, None)
        
        # Refine with keyword matching
        categories = self.income_categories if is_income else self.expense_categories
        
        if not matched_category:
            matched_score = 0
            
            for category_key, category_data in categories.items():
                score = 0
                for keyword in category_data['keywords']:
                    if keyword in full_text:
                        score += 1
                
                if score > matched_score:
                    matched_score = score
                    matched_category = category_key
        
        # If still no match, use Qonto's operation type
        if not matched_category:
            if operation_type == 'transfer' and 'salaire' in full_text:
                matched_category = 'salaire'
            elif operation_type == 'direct_debit':
                matched_category = 'services_externes'
            elif is_income:
                matched_category = 'ventes_services'
            else:
                matched_category = 'services_externes'
        
        # Get accounting details
        category_data = categories.get(matched_category, {
            'account': '471000',  # Default transit account
            'description': 'Compte d\'attente'
        })
        
        # Add enhanced categorization
        transaction['accounting_category'] = matched_category
        transaction['accounting_code'] = category_data.get('account', '471000')
        transaction['accounting_description'] = category_data.get('description', '')
        
        # Calculate VAT if present
        if transaction.get('vat_amount_parsed') and transaction.get('amount_parsed'):
            transaction['vat_rate_calculated'] = (
                transaction['vat_amount_parsed'] / 
                (transaction['amount_parsed'] - transaction['vat_amount_parsed'])
            ) * 100
        
        return transaction
    
    async def analyze_cash_flow(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Analyze cash flow for a period.
        
        Returns:
            Cash flow analysis with insights
        """
        transactions = await self.fetch_transactions_from_sheets(start_date, end_date)
        
        if not transactions:
            return {
                'period': f"{start_date} to {end_date}",
                'total_income': 0,
                'total_expenses': 0,
                'net_cash_flow': 0,
                'transaction_count': 0
            }
        
        # Categorize all transactions
        categorized = [self.categorize_transaction(t) for t in transactions]
        
        # Calculate totals using parsed amounts
        total_income = sum(t.get('amount_parsed', 0) for t in categorized if t.get('amount_parsed', 0) > 0)
        total_expenses = abs(sum(t.get('amount_parsed', 0) for t in categorized if t.get('amount_parsed', 0) < 0))
        
        # Group by category
        expense_by_category = {}
        income_by_category = {}
        
        for transaction in categorized:
            category = transaction.get('category', 'other')
            amount_parsed = transaction.get('amount_parsed', 0)
            amount = abs(amount_parsed)
            
            if amount_parsed < 0:
                expense_by_category[category] = expense_by_category.get(category, 0) + amount
            else:
                income_by_category[category] = income_by_category.get(category, 0) + amount
        
        # Calculate monthly averages
        days = (end_date - start_date).days
        months = max(days / 30, 1)
        
        return {
            'period': f"{start_date} to {end_date}",
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_cash_flow': total_income - total_expenses,
            'transaction_count': len(transactions),
            'average_monthly_income': total_income / months,
            'average_monthly_expenses': total_expenses / months,
            'expense_by_category': expense_by_category,
            'income_by_category': income_by_category,
            'burn_rate': total_expenses / months,
            'runway_months': (total_income - total_expenses) / (total_expenses / months) if total_expenses > 0 else 999.0
        }
    
    async def detect_anomalies(
        self,
        transactions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect anomalies in transactions using statistical analysis.
        
        Returns:
            List of anomalous transactions with reasons
        """
        if not transactions:
            return []
        
        anomalies = []
        
        # Calculate statistics
        amounts = [abs(t.get('amount_parsed', 0)) for t in transactions]
        if not amounts:
            return []
        
        mean_amount = sum(amounts) / len(amounts)
        std_amount = (sum((x - mean_amount) ** 2 for x in amounts) / len(amounts)) ** 0.5
        
        # Detect anomalies
        for transaction in transactions:
            amount = abs(transaction.get('amount_parsed', 0))
            anomaly_reasons = []
            
            # Large amount anomaly (> 3 standard deviations)
            if amount > mean_amount + (3 * std_amount):
                anomaly_reasons.append(f"Montant inhabituel: {amount:.2f}€ (moyenne: {mean_amount:.2f}€)")
            
            # Duplicate detection
            duplicates = [t for t in transactions if 
                         t.get('amount_parsed') == transaction.get('amount_parsed') and
                         t.get('date') == transaction.get('date') and
                         t != transaction]
            if duplicates:
                anomaly_reasons.append("Transaction potentiellement dupliquée")
            
            # Weekend transaction
            if transaction.get('date'):
                weekday = transaction['date'].weekday()
                if weekday >= 5:  # Saturday or Sunday
                    anomaly_reasons.append("Transaction le weekend")
            
            # Round number detection (potential error)
            if amount > 1000 and amount % 100 == 0:
                anomaly_reasons.append("Montant rond important")
            
            if anomaly_reasons:
                anomalies.append({
                    'transaction': transaction,
                    'reasons': anomaly_reasons,
                    'severity': 'high' if len(anomaly_reasons) > 1 else 'medium'
                })
        
        return anomalies
    
    async def generate_expense_report(
        self,
        company_id: int,
        year: int,
        quarter: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate detailed expense report for tax purposes.
        
        Returns:
            Expense report with tax-deductible amounts
        """
        # Determine period
        if quarter:
            start_date = date(year, (quarter - 1) * 3 + 1, 1)
            if quarter == 4:
                end_date = date(year, 12, 31)
            else:
                end_date = date(year, quarter * 3 + 1, 1) - timedelta(days=1)
        else:
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)
        
        # Get transactions
        transactions = await self.fetch_transactions_from_sheets(start_date, end_date)
        categorized = [self.categorize_transaction(t) for t in transactions]
        
        # Calculate tax-deductible expenses
        deductible_categories = [
            'salaire', 'charges_sociales', 'loyer', 'fournitures',
            'services_externes', 'logiciels', 'telecom', 'assurance',
            'formation', 'banque'
        ]
        
        partially_deductible = {
            'restaurant': 0.5,  # 50% deductible for business meals
            'deplacement': 1.0,  # 100% if business travel
            'marketing': 1.0,
        }
        
        total_deductible = 0
        deductible_details = {}
        
        for transaction in categorized:
            amount_parsed = transaction.get('amount_parsed', 0)
            if amount_parsed >= 0:  # Skip income
                continue
            
            category = transaction.get('category', '')
            amount = abs(amount_parsed)
            
            if category in deductible_categories:
                total_deductible += amount
                deductible_details[category] = deductible_details.get(category, 0) + amount
            elif category in partially_deductible:
                deductible_amount = amount * partially_deductible[category]
                total_deductible += deductible_amount
                deductible_details[category] = deductible_details.get(category, 0) + deductible_amount
        
        # Calculate VAT
        vat_deductible = 0
        for t in categorized:
            amount = t.get('amount_parsed', 0)
            if amount < 0:  # Expense
                vat_amount = t.get('vat_amount_parsed', 0)
                if vat_amount == 0:
                    vat_amount = abs(amount) * 0.2  # Default VAT estimate
                vat_deductible += abs(vat_amount)
        
        return {
            'period': f"{start_date} to {end_date}",
            'total_expenses': sum(abs(t.get('amount_parsed', 0)) for t in categorized if t.get('amount_parsed', 0) < 0),
            'total_deductible': total_deductible,
            'deductible_by_category': deductible_details,
            'vat_deductible': vat_deductible,
            'non_deductible': sum(abs(t.get('amount_parsed', 0)) for t in categorized 
                                 if t.get('amount_parsed', 0) < 0 and 
                                 t.get('category') not in deductible_categories and
                                 t.get('category') not in partially_deductible),
            'transaction_count': len([t for t in categorized if t.get('amount_parsed', 0) < 0]),
            'requires_receipts': [t for t in categorized 
                                 if abs(t.get('amount_parsed', 0)) > 150 and t.get('amount_parsed', 0) < 0]
        }
    
    async def predict_future_expenses(
        self,
        months_ahead: int = 3
    ) -> Dict[str, Any]:
        """
        Predict future expenses based on historical data.
        
        Returns:
            Expense predictions and recommendations
        """
        # Get last 6 months of data
        end_date = date.today()
        start_date = end_date - timedelta(days=180)
        
        transactions = await self.fetch_transactions_from_sheets(start_date, end_date)
        categorized = [self.categorize_transaction(t) for t in transactions]
        
        # Calculate monthly averages by category
        monthly_expenses = {}
        for transaction in categorized:
            amount_parsed = transaction.get('amount_parsed', 0)
            if amount_parsed >= 0:
                continue
            
            month_key = transaction.get('date', date.today()).strftime('%Y-%m')
            category = transaction.get('category', 'other')
            
            if month_key not in monthly_expenses:
                monthly_expenses[month_key] = {}
            
            monthly_expenses[month_key][category] = (
                monthly_expenses[month_key].get(category, 0) + abs(amount_parsed)
            )
        
        # Calculate averages
        category_averages = {}
        for month_data in monthly_expenses.values():
            for category, amount in month_data.items():
                if category not in category_averages:
                    category_averages[category] = []
                category_averages[category].append(amount)
        
        predictions = {}
        for category, amounts in category_averages.items():
            avg = sum(amounts) / len(amounts)
            # Simple linear trend
            if len(amounts) > 1:
                trend = (amounts[-1] - amounts[0]) / len(amounts)
            else:
                trend = 0
            
            predictions[category] = {
                'average_monthly': avg,
                'trend': trend,
                'predicted_next_month': avg + trend,
                'predicted_total': (avg + trend) * months_ahead
            }
        
        total_predicted = sum(p['predicted_total'] for p in predictions.values())
        
        return {
            'months_ahead': months_ahead,
            'predictions_by_category': predictions,
            'total_predicted_expenses': total_predicted,
            'monthly_average': total_predicted / months_ahead,
            'recommendations': self._generate_cost_saving_recommendations(predictions)
        }
    
    def _generate_cost_saving_recommendations(
        self,
        predictions: Dict[str, Dict[str, float]]
    ) -> List[str]:
        """Generate cost-saving recommendations based on predictions."""
        recommendations = []
        
        for category, data in predictions.items():
            if data['trend'] > data['average_monthly'] * 0.1:  # Growing > 10%
                recommendations.append(
                    f"⚠️ {category}: Coûts en augmentation (+{data['trend']:.2f}€/mois). "
                    f"Considérez de renégocier ou optimiser."
                )
            
            if category == 'logiciels' and data['average_monthly'] > 500:
                recommendations.append(
                    "💡 Frais logiciels élevés. Vérifiez les doublons et abonnements inutilisés."
                )
            
            if category == 'telecom' and data['average_monthly'] > 200:
                recommendations.append(
                    "💡 Frais télécom importants. Comparez les offres professionnelles."
                )
        
        return recommendations


# Singleton instance
qonto_service = QontoService()