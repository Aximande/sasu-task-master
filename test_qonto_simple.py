#!/usr/bin/env python3
"""
Simple test to see which Qonto endpoints work
"""
import asyncio
import sys
from dotenv import load_dotenv
load_dotenv('/Users/alexandrelavalleeperso/Desktop/code/sasu-task-master/fiscalia_backend/.env')

sys.path.append('/Users/alexandrelavalleeperso/Desktop/code/sasu-task-master/fiscalia_backend')

from app.services.qonto_service import QontoService
from datetime import date

async def test_endpoints():
    print("🧪 Testing individual Qonto endpoints...\n")
    
    service = QontoService()
    
    # Test 1: Transactions (should work)
    print("1. Testing transactions...")
    try:
        transactions = await service.fetch_transactions_from_sheets()
        print(f"✅ Transactions: {len(transactions)} found")
    except Exception as e:
        print(f"❌ Transactions: {e}")
    
    # Test 2: Cash Flow (failing)
    print("\n2. Testing cash flow...")
    try:
        start_date = date(2025, 9, 1)
        end_date = date(2025, 9, 30)
        cash_flow = await service.analyze_cash_flow(start_date, end_date)
        print(f"✅ Cash flow: {cash_flow}")
    except Exception as e:
        print(f"❌ Cash flow: {e}")
    
    # Test 3: Predictions (failing)
    print("\n3. Testing predictions...")
    try:
        predictions = await service.predict_future_expenses()
        print(f"✅ Predictions: {predictions}")
    except Exception as e:
        print(f"❌ Predictions: {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())