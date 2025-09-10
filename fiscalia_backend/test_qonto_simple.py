#!/usr/bin/env python3
"""
Simple test script to verify Qonto Google Sheets connection
"""
import os
from datetime import date, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_google_sheets_connection():
    """Test direct connection to Google Sheets."""
    print("🔍 Testing Qonto Google Sheets Connection...")
    print("=" * 50)
    
    # Check credentials
    key_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY', '')
    sheet_id = os.getenv('QONTO_SHEETS_ID', '10u_3D39lHyeHAOkujcR5KEnxfermJhYw9BrQ6DEG3c8')
    
    print(f"📋 Configuration:")
    print(f"  Service Account Key: {key_path}")
    print(f"  Sheet ID: {sheet_id}")
    
    if not key_path or not os.path.exists(key_path):
        print(f"❌ Service account key not found at: {key_path}")
        print("Please make sure the JSON key file is in the correct location.")
        return False
    
    try:
        # Authenticate
        print("\n🔐 Authenticating with Google...")
        credentials = service_account.Credentials.from_service_account_file(
            key_path,
            scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
        )
        
        service = build('sheets', 'v4', credentials=credentials)
        sheet = service.spreadsheets()
        
        # Try to read the first few rows
        print("📊 Reading from Qonto sheet...")
        result = sheet.values().get(
            spreadsheetId=sheet_id,
            range='A1:Q10'  # First 10 rows, all columns
        ).execute()
        
        values = result.get('values', [])
        
        if not values:
            print("⚠️  Sheet appears to be empty")
            return False
        
        print(f"✅ Successfully connected! Found {len(values)} rows")
        
        # Show headers
        if len(values) > 0:
            headers = values[0]
            print(f"\n📋 Sheet columns ({len(headers)} columns):")
            for i, header in enumerate(headers[:10]):  # Show first 10 columns
                print(f"  {i+1}. {header}")
        
        # Show sample data
        if len(values) > 1:
            print(f"\n📝 Sample transactions (found {len(values)-1} data rows):")
            for i in range(1, min(4, len(values))):  # Show up to 3 transactions
                row = values[i]
                if len(row) > 4:
                    print(f"\n  Transaction {i}:")
                    print(f"    Status: {row[0] if len(row) > 0 else 'N/A'}")
                    print(f"    Date: {row[2] if len(row) > 2 else 'N/A'}")
                    print(f"    Counterparty: {row[4] if len(row) > 4 else 'N/A'}")
                    print(f"    Amount: {row[11] if len(row) > 11 else 'N/A'} {row[12] if len(row) > 12 else 'EUR'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error connecting to Google Sheets: {e}")
        print("\n🔍 Troubleshooting tips:")
        print("1. Make sure you shared the Google Sheet with the service account email")
        print("2. The service account email should look like: xxxxx@xxxxx.iam.gserviceaccount.com")
        print("3. Grant 'Viewer' permission to the service account")
        print("4. Make sure Google Sheets API is enabled in your Google Cloud project")
        return False


if __name__ == "__main__":
    print("🚀 FiscalIA Pro - Qonto Integration Test (Simple)")
    print("=" * 50)
    
    success = test_google_sheets_connection()
    
    if success:
        print("\n" + "=" * 50)
        print("🎉 Success! Your Qonto Google Sheets integration is working!")
        print("\nNext steps:")
        print("1. The backend can now read your Qonto transactions")
        print("2. Transactions will be automatically categorized for French accounting")
        print("3. Real-time tax calculations will use your actual bank data")
    else:
        print("\n" + "=" * 50)
        print("⚠️  Connection failed. Please check the errors above.")
        print("\nMake sure you have:")
        print("1. Downloaded the service account JSON key")
        print("2. Placed it in: fiscalia_backend/credentials/google-service-account.json")
        print("3. Shared your Qonto sheet with the service account email")