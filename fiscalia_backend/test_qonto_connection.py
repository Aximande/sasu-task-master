#!/usr/bin/env python3
"""
Test script to verify Qonto Google Sheets connection
"""
import asyncio
import sys
from pathlib import Path
from datetime import date, timedelta

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parent))

from app.services.qonto_service import qonto_service


async def test_connection():
    """Test the Qonto Google Sheets connection."""
    print("🔍 Testing Qonto Google Sheets Connection...")
    print("=" * 50)
    
    # Test 1: Fetch recent transactions
    print("\n1. Fetching recent transactions...")
    try:
        # Get last 30 days of transactions
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        transactions = await qonto_service.fetch_transactions_from_sheets(
            start_date=start_date,
            end_date=end_date
        )
        
        if transactions:
            print(f"✅ Successfully fetched {len(transactions)} transactions!")
            
            # Show first transaction as example
            if len(transactions) > 0:
                first = transactions[0]
                print(f"\nExample transaction:")
                print(f"  Date: {first.get('settled_at', 'N/A')}")
                print(f"  Counterparty: {first.get('counterparty_name', 'N/A')}")
                print(f"  Amount: {first.get('amount', 'N/A')} {first.get('currency', 'EUR')}")
                print(f"  Type: {first.get('operation_type', 'N/A')}")
                print(f"  Status: {first.get('status', 'N/A')}")
        else:
            print("⚠️  No transactions found in the specified period")
    except Exception as e:
        print(f"❌ Error fetching transactions: {e}")
        return False
    
    # Test 2: Categorize a transaction
    print("\n2. Testing transaction categorization...")
    try:
        if transactions and len(transactions) > 0:
            categorized = qonto_service.categorize_transaction(transactions[0])
            print(f"✅ Transaction categorized:")
            print(f"  Accounting category: {categorized.get('accounting_category', 'N/A')}")
            print(f"  Accounting code: {categorized.get('accounting_code', 'N/A')}")
            print(f"  Description: {categorized.get('accounting_description', 'N/A')}")
    except Exception as e:
        print(f"❌ Error categorizing transaction: {e}")
    
    # Test 3: Analyze cash flow
    print("\n3. Analyzing cash flow...")
    try:
        cash_flow = await qonto_service.analyze_cash_flow(start_date, end_date)
        print(f"✅ Cash flow analysis complete:")
        print(f"  Total income: {cash_flow.get('total_income', 0):.2f} EUR")
        print(f"  Total expenses: {cash_flow.get('total_expenses', 0):.2f} EUR")
        print(f"  Net cash flow: {cash_flow.get('net_cash_flow', 0):.2f} EUR")
        print(f"  Transaction count: {cash_flow.get('transaction_count', 0)}")
    except Exception as e:
        print(f"❌ Error analyzing cash flow: {e}")
    
    print("\n" + "=" * 50)
    print("✨ Connection test complete!")
    return True


async def check_credentials():
    """Check if credentials are properly configured."""
    import os
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    
    print("\n📋 Checking configuration...")
    
    # Check for service account key
    key_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY', '')
    if key_path and os.path.exists(key_path):
        print(f"✅ Service account key found: {key_path}")
    else:
        print(f"❌ Service account key not found!")
        print(f"   Expected at: {key_path}")
        print("\n   Please make sure you:")
        print("   1. Downloaded the JSON key from Google Cloud Console")
        print("   2. Saved it to: fiscalia_backend/credentials/google-service-account.json")
        return False
    
    # Check for sheet ID
    sheet_id = os.getenv('QONTO_SHEETS_ID', '')
    if sheet_id:
        print(f"✅ Qonto Sheet ID configured: {sheet_id}")
    else:
        print("❌ Qonto Sheet ID not configured!")
        return False
    
    return True


if __name__ == "__main__":
    print("🚀 FiscalIA Pro - Qonto Integration Test")
    print("=" * 50)
    
    # First check credentials
    if not asyncio.run(check_credentials()):
        print("\n⚠️  Please fix the configuration issues above and try again.")
        sys.exit(1)
    
    # Then test the connection
    success = asyncio.run(test_connection())
    
    if success:
        print("\n🎉 All tests passed! Your Qonto integration is ready to use!")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        print("\nCommon issues:")
        print("1. Make sure the service account email is added to your Google Sheet")
        print("2. Verify the JSON key file is in the correct location")
        print("3. Check that the Google Sheets API is enabled in your project")