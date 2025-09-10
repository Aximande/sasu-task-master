#!/usr/bin/env python3
"""
Check service account email address
"""
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

key_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY', '')

if not key_path or not os.path.exists(key_path):
    print(f"❌ Service account key not found at: {key_path}")
else:
    try:
        with open(key_path, 'r') as f:
            key_data = json.load(f)
            
        service_account_email = key_data.get('client_email', 'Not found')
        project_id = key_data.get('project_id', 'Not found')
        
        print("📧 Service Account Details:")
        print("=" * 60)
        print(f"Service Account Email: {service_account_email}")
        print(f"Project ID: {project_id}")
        print("=" * 60)
        print("\n📝 What to do now:")
        print("1. Copy the service account email above")
        print("2. Open your Qonto Google Sheet:")
        print("   https://docs.google.com/spreadsheets/d/10u_3D39lHyeHAOkujcR5KEnxfermJhYw9BrQ6DEG3c8")
        print("3. Click the 'Share' button (top-right)")
        print(f"4. Paste this email: {service_account_email}")
        print("5. Set permission to 'Viewer'")
        print("6. Uncheck 'Notify people'")
        print("7. Click 'Share'")
        
    except Exception as e:
        print(f"❌ Error reading service account key: {e}")