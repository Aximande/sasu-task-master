#!/usr/bin/env python3
"""
Test script to debug Google Sheets authentication for Qonto integration
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('/Users/alexandrelavalleeperso/Desktop/code/sasu-task-master/fiscalia_backend/.env')

sys.path.append('/Users/alexandrelavalleeperso/Desktop/code/sasu-task-master/fiscalia_backend')

from app.services.qonto_service import QontoService
from app.core.config import settings

def test_authentication():
    print("=== Qonto Google Sheets Authentication Test ===")
    
    # Check environment variables
    print(f"GOOGLE_SERVICE_ACCOUNT_KEY: {os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY')}")
    print(f"QONTO_SHEETS_ID: {os.getenv('QONTO_SHEETS_ID')}")
    
    # Check file existence
    creds_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY', '')
    print(f"Credentials file exists: {os.path.exists(creds_path)}")
    
    if os.path.exists(creds_path):
        print(f"File size: {os.path.getsize(creds_path)} bytes")
        
        # Check if file is readable
        try:
            with open(creds_path, 'r') as f:
                content = f.read(100)
                print(f"File starts with: {content[:50]}...")
        except Exception as e:
            print(f"Error reading file: {e}")
    
    # Test the service
    print("\n=== Testing QontoService ===")
    try:
        service = QontoService()
        print("QontoService created successfully")
        
        # Try to authenticate
        sheets_service = service._authenticate_google_sheets()
        print(f"Authentication result: {sheets_service is not None}")
        
        if sheets_service:
            print("✅ Google Sheets authentication successful!")
        else:
            print("❌ Google Sheets authentication failed - using mock data")
            
    except Exception as e:
        print(f"Error creating QontoService: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_authentication()