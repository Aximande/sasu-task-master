#!/usr/bin/env python3
"""
Full integration test showing Qonto data analysis capabilities
"""
import asyncio
import sys
from pathlib import Path
from datetime import date, timedelta
from decimal import Decimal

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parent))

# Configure environment before importing
import os
os.environ['BACKEND_CORS_ORIGINS'] = 'http://localhost:3000'  # Simple value to avoid parsing issues

from app.services.qonto_service import qonto_service


async def main():
    """Test full Qonto integration capabilities."""
    print("🚀 FiscalIA Pro - Full Qonto Integration Demo")
    print("=" * 70)
    
    # Get date range for analysis
    end_date = date.today()
    start_date = date(2024, 1, 1)  # Get all 2024+ data
    
    print(f"\n📅 Analyzing transactions from {start_date} to {end_date}")
    print("-" * 70)
    
    # 1. Fetch transactions
    print("\n1️⃣ FETCHING TRANSACTIONS...")
    transactions = await qonto_service.fetch_transactions_from_sheets(
        start_date=start_date,
        end_date=end_date
    )
    
    if not transactions:
        print("❌ No transactions found")
        return
    
    print(f"✅ Found {len(transactions)} transactions")
    
    # 2. Show categorization
    print("\n2️⃣ TRANSACTION CATEGORIZATION:")
    print("-" * 70)
    
    for i, trans in enumerate(transactions[:5]):  # Show first 5
        categorized = qonto_service.categorize_transaction(trans)
        
        print(f"\nTransaction {i+1}:")
        print(f"  Date: {trans.get('settled_at', 'N/A')}")
        print(f"  Counterparty: {trans.get('counterparty_name', 'N/A')}")
        print(f"  Amount: {trans.get('amount', 0)} {trans.get('currency', 'EUR')}")
        print(f"  Type: {'Income' if trans.get('side') == 'credit' else 'Expense'}")
        print(f"  📊 Accounting Category: {categorized.get('accounting_category', 'N/A')}")
        print(f"  📚 Accounting Code: {categorized.get('accounting_code', 'N/A')}")
        print(f"  📝 Description: {categorized.get('accounting_description', 'N/A')}")
        
        if categorized.get('vat_amount_parsed'):
            print(f"  💶 VAT: {categorized.get('vat_amount_parsed', 0):.2f} EUR")
    
    # 3. Cash flow analysis
    print("\n3️⃣ CASH FLOW ANALYSIS:")
    print("-" * 70)
    
    # Last 30 days
    recent_start = end_date - timedelta(days=30)
    cash_flow = await qonto_service.analyze_cash_flow(recent_start, end_date)
    
    print(f"\n📊 Last 30 Days Summary:")
    print(f"  Total Income: {cash_flow.get('total_income', 0):,.2f} EUR")
    print(f"  Total Expenses: {cash_flow.get('total_expenses', 0):,.2f} EUR")
    print(f"  Net Cash Flow: {cash_flow.get('net_cash_flow', 0):,.2f} EUR")
    print(f"  Burn Rate: {cash_flow.get('burn_rate', 0):,.2f} EUR/month")
    
    # Show expense breakdown
    if cash_flow.get('expense_by_category'):
        print(f"\n💸 Expense Breakdown by Category:")
        for category, amount in cash_flow['expense_by_category'].items():
            print(f"  {category}: {amount:,.2f} EUR")
    
    # 4. Generate expense report for tax
    print("\n4️⃣ TAX EXPENSE REPORT (Q4 2024):")
    print("-" * 70)
    
    expense_report = await qonto_service.generate_expense_report(
        company_id=1,  # Mock company ID
        year=2024,
        quarter=4
    )
    
    print(f"\n📋 Q4 2024 Tax Summary:")
    print(f"  Total Expenses: {expense_report.get('total_expenses', 0):,.2f} EUR")
    print(f"  Tax Deductible: {expense_report.get('total_deductible', 0):,.2f} EUR")
    print(f"  VAT Deductible: {expense_report.get('vat_deductible', 0):,.2f} EUR")
    print(f"  Non-Deductible: {expense_report.get('non_deductible', 0):,.2f} EUR")
    
    if expense_report.get('deductible_by_category'):
        print(f"\n📂 Deductible Expenses by Category:")
        for category, amount in expense_report['deductible_by_category'].items():
            print(f"  {category}: {amount:,.2f} EUR")
    
    # 5. Anomaly detection
    print("\n5️⃣ ANOMALY DETECTION:")
    print("-" * 70)
    
    anomalies = await qonto_service.detect_anomalies(transactions)
    
    if anomalies:
        print(f"\n⚠️ Found {len(anomalies)} potential anomalies:")
        for anomaly in anomalies[:3]:  # Show first 3
            trans = anomaly['transaction']
            print(f"\n  Transaction: {trans.get('counterparty_name')} - {trans.get('amount')} EUR")
            print(f"  Date: {trans.get('settled_at')}")
            for reason in anomaly['reasons']:
                print(f"  ⚠️ {reason}")
    else:
        print("\n✅ No anomalies detected")
    
    # 6. Future expense prediction
    print("\n6️⃣ EXPENSE PREDICTION (Next 3 Months):")
    print("-" * 70)
    
    predictions = await qonto_service.predict_future_expenses(months_ahead=3)
    
    print(f"\n🔮 Predicted Expenses for Next 3 Months:")
    print(f"  Total Predicted: {predictions.get('total_predicted_expenses', 0):,.2f} EUR")
    print(f"  Monthly Average: {predictions.get('monthly_average', 0):,.2f} EUR")
    
    if predictions.get('recommendations'):
        print(f"\n💡 Cost-Saving Recommendations:")
        for rec in predictions['recommendations']:
            print(f"  {rec}")
    
    print("\n" + "=" * 70)
    print("✨ Integration test complete!")
    print("\n🎯 Your FiscalIA Pro system can now:")
    print("  ✅ Read real-time Qonto transactions")
    print("  ✅ Automatically categorize for French accounting")
    print("  ✅ Calculate VAT and tax-deductible amounts")
    print("  ✅ Detect anomalies and unusual transactions")
    print("  ✅ Predict future expenses")
    print("  ✅ Generate tax-ready reports")


if __name__ == "__main__":
    asyncio.run(main())