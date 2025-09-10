"""
AI service for document processing and tax assistance.
"""
import json
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import httpx
from PIL import Image
import io
import pytesseract

from app.core.config import settings
from app.core.timezone import now_paris, get_application_current_date, format_paris_datetime


class AIDocumentProcessor:
    """
    AI service for processing fiscal documents.
    Uses OCR and NLP to extract structured data.
    """
    
    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.anthropic_key = settings.ANTHROPIC_API_KEY
        
        # Document type patterns
        self.document_patterns = {
            'invoice': ['facture', 'invoice', 'montant ht', 'tva', 'ttc'],
            'receipt': ['reçu', 'receipt', 'ticket', 'espèces', 'cb'],
            'payslip': ['bulletin', 'salaire', 'paie', 'net à payer'],
            'tax_declaration': ['déclaration', 'impôt', 'fiscal', 'cerfa'],
            'bank_statement': ['relevé', 'bancaire', 'compte', 'solde']
        }
        
        # Regex patterns for data extraction
        self.regex_patterns = {
            'siren': r'\b\d{3}\s?\d{3}\s?\d{3}\b',
            'siret': r'\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b',
            'vat_number': r'FR\s?\d{2}\s?\d{9}',
            'amount': r'(\d+[\s,]?\d*\.?\d*)\s*€',
            'date': r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            'invoice_number': r'[FN]°?\s*(\w+-?\w+)',
            'iban': r'[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}'
        }
    
    async def process_document(
        self,
        file_content: bytes,
        file_type: str,
        document_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a document and extract structured data.
        """
        start_time = now_paris()
        
        # Extract text based on file type
        if file_type.lower() in ['.pdf']:
            text = await self._extract_text_from_pdf(file_content)
        elif file_type.lower() in ['.jpg', '.jpeg', '.png']:
            text = await self._extract_text_from_image(file_content)
        else:
            text = file_content.decode('utf-8', errors='ignore')
        
        # Detect document type if not provided
        if not document_type:
            document_type = self._detect_document_type(text)
        
        # Extract structured data
        extracted_data = self._extract_structured_data(text, document_type)
        
        # Extract amounts
        amounts = self._extract_amounts(text)
        
        # Extract dates
        dates = self._extract_dates(text)
        
        # Extract entities
        entities = self._extract_entities(text)
        
        # Calculate confidence score
        confidence_score = self._calculate_confidence(
            extracted_data, amounts, dates, entities
        )
        
        # Generate suggestions
        suggestions = self._generate_suggestions(
            document_type, extracted_data, confidence_score
        )
        
        processing_time = int((now_paris() - start_time).total_seconds() * 1000)
        
        return {
            'document_type_detected': document_type,
            'extracted_data': extracted_data,
            'amounts_detected': amounts,
            'dates_detected': dates,
            'entities_detected': entities,
            'confidence_score': confidence_score,
            'suggestions': suggestions,
            'processing_time_ms': processing_time,
            'raw_text': text[:1000]  # First 1000 chars for reference
        }
    
    async def _extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """Extract text from PDF document."""
        try:
            import PyPDF2
            import io
            
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text
        except Exception as e:
            return f"Error extracting PDF: {str(e)}"
    
    async def _extract_text_from_image(self, image_content: bytes) -> str:
        """Extract text from image using OCR."""
        try:
            image = Image.open(io.BytesIO(image_content))
            text = pytesseract.image_to_string(image, lang='fra')
            return text
        except Exception as e:
            return f"Error extracting text from image: {str(e)}"
    
    def _detect_document_type(self, text: str) -> str:
        """Detect document type based on content."""
        text_lower = text.lower()
        scores = {}
        
        for doc_type, patterns in self.document_patterns.items():
            score = sum(1 for pattern in patterns if pattern in text_lower)
            scores[doc_type] = score
        
        if scores:
            return max(scores, key=scores.get)
        return 'other'
    
    def _extract_structured_data(
        self, text: str, document_type: str
    ) -> Dict[str, Any]:
        """Extract structured data based on document type."""
        data = {}
        
        if document_type == 'invoice':
            data = self._extract_invoice_data(text)
        elif document_type == 'payslip':
            data = self._extract_payslip_data(text)
        elif document_type == 'receipt':
            data = self._extract_receipt_data(text)
        
        return data
    
    def _extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extract invoice-specific data."""
        data = {}
        
        # Extract invoice number
        invoice_match = re.search(self.regex_patterns['invoice_number'], text)
        if invoice_match:
            data['invoice_number'] = invoice_match.group(1)
        
        # Extract amounts (HT, TVA, TTC)
        text_lower = text.lower()
        
        ht_match = re.search(r'(?:montant |total )?ht?\s*:?\s*(\d+[\s,]?\d*\.?\d*)', text_lower)
        if ht_match:
            data['amount_ht'] = self._parse_amount(ht_match.group(1))
        
        tva_match = re.search(r'tva\s*(?:20\s*%)?\s*:?\s*(\d+[\s,]?\d*\.?\d*)', text_lower)
        if tva_match:
            data['amount_tva'] = self._parse_amount(tva_match.group(1))
        
        ttc_match = re.search(r'(?:montant |total )?ttc\s*:?\s*(\d+[\s,]?\d*\.?\d*)', text_lower)
        if ttc_match:
            data['amount_ttc'] = self._parse_amount(ttc_match.group(1))
        
        return data
    
    def _extract_payslip_data(self, text: str) -> Dict[str, Any]:
        """Extract payslip-specific data."""
        data = {}
        
        # Extract salary amounts
        gross_match = re.search(r'salaire brut\s*:?\s*(\d+[\s,]?\d*\.?\d*)', text.lower())
        if gross_match:
            data['gross_salary'] = self._parse_amount(gross_match.group(1))
        
        net_match = re.search(r'net à payer\s*:?\s*(\d+[\s,]?\d*\.?\d*)', text.lower())
        if net_match:
            data['net_salary'] = self._parse_amount(net_match.group(1))
        
        return data
    
    def _extract_receipt_data(self, text: str) -> Dict[str, Any]:
        """Extract receipt-specific data."""
        data = {}
        
        # Extract total amount
        total_match = re.search(r'total\s*:?\s*(\d+[\s,]?\d*\.?\d*)', text.lower())
        if total_match:
            data['total_amount'] = self._parse_amount(total_match.group(1))
        
        return data
    
    def _extract_amounts(self, text: str) -> Dict[str, float]:
        """Extract all monetary amounts from text."""
        amounts = {}
        matches = re.findall(self.regex_patterns['amount'], text)
        
        for i, match in enumerate(matches[:5]):  # Limit to first 5 amounts
            amount = self._parse_amount(match)
            if amount > 0:
                amounts[f'amount_{i+1}'] = amount
        
        return amounts
    
    def _extract_dates(self, text: str) -> Dict[str, str]:
        """Extract dates from text."""
        dates = {}
        matches = re.findall(self.regex_patterns['date'], text)
        
        for i, match in enumerate(matches[:3]):  # Limit to first 3 dates
            try:
                # Try to parse and normalize date
                normalized = self._normalize_date(match)
                dates[f'date_{i+1}'] = normalized
            except:
                dates[f'date_{i+1}'] = match
        
        return dates
    
    def _extract_entities(self, text: str) -> Dict[str, str]:
        """Extract business entities (SIREN, VAT numbers, etc.)."""
        entities = {}
        
        # Extract SIREN
        siren_match = re.search(self.regex_patterns['siren'], text)
        if siren_match:
            entities['siren'] = siren_match.group().replace(' ', '')
        
        # Extract SIRET
        siret_match = re.search(self.regex_patterns['siret'], text)
        if siret_match:
            entities['siret'] = siret_match.group().replace(' ', '')
        
        # Extract VAT number
        vat_match = re.search(self.regex_patterns['vat_number'], text)
        if vat_match:
            entities['vat_number'] = vat_match.group().replace(' ', '')
        
        # Extract IBAN
        iban_match = re.search(self.regex_patterns['iban'], text)
        if iban_match:
            entities['iban'] = iban_match.group().replace(' ', '')
        
        return entities
    
    def _parse_amount(self, amount_str: str) -> float:
        """Parse amount string to float."""
        try:
            # Remove spaces and replace comma with dot
            cleaned = amount_str.replace(' ', '').replace(',', '.')
            return float(cleaned)
        except:
            return 0.0
    
    def _normalize_date(self, date_str: str) -> str:
        """Normalize date to ISO format."""
        # Simple normalization - extend as needed
        parts = re.split(r'[/-]', date_str)
        if len(parts) == 3:
            day, month, year = parts
            if len(year) == 2:
                year = '20' + year
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        return date_str
    
    def _calculate_confidence(
        self,
        extracted_data: Dict,
        amounts: Dict,
        dates: Dict,
        entities: Dict
    ) -> float:
        """Calculate confidence score for extraction."""
        score = 0.0
        total_checks = 0
        
        # Check data completeness
        if extracted_data:
            score += len(extracted_data) * 0.2
            total_checks += len(extracted_data)
        
        if amounts:
            score += min(len(amounts) * 0.2, 1.0)
            total_checks += 1
        
        if dates:
            score += min(len(dates) * 0.2, 1.0)
            total_checks += 1
        
        if entities:
            score += len(entities) * 0.3
            total_checks += len(entities)
        
        if total_checks > 0:
            return min(score / total_checks, 1.0)
        return 0.0
    
    def _generate_suggestions(
        self,
        document_type: str,
        extracted_data: Dict,
        confidence_score: float
    ) -> List[str]:
        """Generate suggestions based on extraction results."""
        suggestions = []
        
        if confidence_score < 0.5:
            suggestions.append("La qualité du document semble faible. Considérez un nouveau scan.")
        
        if document_type == 'invoice':
            if 'invoice_number' not in extracted_data:
                suggestions.append("Numéro de facture non détecté. Vérifiez manuellement.")
            if 'amount_ttc' not in extracted_data:
                suggestions.append("Montant TTC non détecté. Ajoutez-le manuellement.")
        
        elif document_type == 'payslip':
            if 'net_salary' not in extracted_data:
                suggestions.append("Salaire net non détecté. Vérifiez le bulletin.")
        
        if not suggestions:
            suggestions.append("Document traité avec succès.")
        
        return suggestions


class AITaxAssistant:
    """
    AI assistant for tax optimization and advice.
    """
    
    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.anthropic_key = settings.ANTHROPIC_API_KEY
    
    async def get_tax_advice(
        self,
        context: Dict[str, Any],
        question: str
    ) -> Dict[str, Any]:
        """
        Get AI-powered tax advice based on context.
        """
        # Format context for AI
        context_str = self._format_context(context)
        
        # Generate prompt with current date context
        current_date = get_application_current_date()
        formatted_date = format_paris_datetime(current_date, "%d/%m/%Y")
        
        prompt = f"""
        En tant qu'expert fiscal français spécialisé dans les SASU, 
        répondez à cette question en tenant compte de la date actuelle.
        
        Date actuelle: {formatted_date} (10 septembre 2025)
        Année fiscale: 2025
        Trimestre: T3 2025
        
        Question: {question}
        
        Contexte:
        {context_str}
        
        Fournissez une réponse structurée avec:
        1. Réponse directe
        2. Explications détaillées  
        3. Recommandations pratiques
        4. Points d'attention
        5. Échéances fiscales pertinentes pour septembre 2025
        """
        
        # Here you would call OpenAI/Anthropic API
        # For now, return a structured response
        return {
            'answer': "Réponse basée sur le contexte fiscal français.",
            'explanations': ["Point 1", "Point 2"],
            'recommendations': ["Recommandation 1", "Recommandation 2"],
            'warnings': ["Attention à..."],
            'confidence': 0.85
        }
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context for AI prompt."""
        lines = []
        for key, value in context.items():
            lines.append(f"- {key}: {value}")
        return "\n".join(lines)
    
    async def analyze_tax_situation(
        self,
        company_data: Dict,
        calculations: List[Dict]
    ) -> Dict[str, Any]:
        """
        Analyze overall tax situation and provide insights.
        """
        insights = []
        opportunities = []
        risks = []
        
        # Analyze trends
        if calculations:
            # Tax rate trend
            tax_rates = [calc.get('effective_tax_rate', 0) for calc in calculations]
            if tax_rates:
                avg_rate = sum(tax_rates) / len(tax_rates)
                if avg_rate > 0.4:
                    risks.append("Taux d'imposition effectif élevé (>40%)")
                    opportunities.append("Explorer les dispositifs de défiscalisation")
        
        # Company-specific analysis
        if company_data.get('president_remuneration_type') == 'dividends':
            insights.append("Rémunération principalement en dividendes")
            opportunities.append("Considérer un mix salaire/dividendes pour optimiser")
        
        return {
            'insights': insights,
            'opportunities': opportunities,
            'risks': risks,
            'overall_score': self._calculate_health_score(company_data, calculations)
        }
    
    def _calculate_health_score(
        self,
        company_data: Dict,
        calculations: List[Dict]
    ) -> float:
        """Calculate overall tax health score."""
        score = 0.7  # Base score
        
        # Adjust based on tax efficiency
        if calculations:
            latest_calc = calculations[0]
            if latest_calc.get('effective_tax_rate', 0) < 0.35:
                score += 0.1
            elif latest_calc.get('effective_tax_rate', 0) > 0.45:
                score -= 0.1
        
        return max(0.0, min(1.0, score))