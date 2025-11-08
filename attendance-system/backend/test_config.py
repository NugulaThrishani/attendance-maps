#!/usr/bin/env python3
"""
Test configuration loading
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.config import settings

print("🔧 Configuration Test")
print("=" * 50)
print(f"Environment: {settings.ENVIRONMENT}")
print(f"Supabase URL: {settings.SUPABASE_URL}")
print(f"Supabase Anon Key: {settings.SUPABASE_ANON_KEY[:30]}..." if settings.SUPABASE_ANON_KEY else "No key")
print(f"JWT Secret: {settings.JWT_SECRET_KEY[:30]}..." if settings.JWT_SECRET_KEY else "No key")
print(f"Allowed SSIDs: {settings.ALLOWED_SSIDS}")

print("\n📁 .env file check:")
env_path = os.path.join(os.path.dirname(__file__), '.env')
print(f"Looking for .env at: {env_path}")
print(f".env file exists: {os.path.exists(env_path)}")

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        content = f.read()
        print(f".env file size: {len(content)} characters")
        lines = content.split('\n')
        print(f"First few lines:")
        for line in lines[:5]:
            if line.strip() and not line.startswith('#'):
                print(f"  {line}")