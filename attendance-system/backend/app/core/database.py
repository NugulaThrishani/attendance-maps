from supabase import create_client, Client
from app.core.config import settings
import asyncio
import os
import ssl
import certifi
import urllib3

# SSL Configuration for development
if not settings.SSL_VERIFY:
    # Disable SSL warnings for development
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

print(f"🔗 Connecting to Supabase URL: {settings.SUPABASE_URL}")
print(f"🔐 Using SSL verification: {settings.SSL_VERIFY}")

# Supabase client instance
supabase: Client = create_client(
    settings.SUPABASE_URL, 
    settings.SUPABASE_ANON_KEY
)

supabase_admin: Client = create_client(
    settings.SUPABASE_URL, 
    settings.SUPABASE_SERVICE_KEY
)

async def init_db():
    """Initialize database connection"""
    try:
        # Test database connection by checking if our main tables exist
        result = supabase.table("users").select("id").limit(1).execute()
        
        print("✅ Database connection successful")
        print("📊 Connected to production Supabase database")
        
    except Exception as e:
        print(f"⚠️ Database connection failed: {str(e)}")
        print("📝 Please check your Supabase credentials in .env file")
        # Don't raise the error, just warn - allow server to start for API testing

def get_db():
    """Get database client"""
    return supabase

def get_admin_db():
    """Get admin database client"""  
    return supabase_admin