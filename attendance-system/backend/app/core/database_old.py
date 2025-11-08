from supabase import create_client, Client
from app.core.config import settings
from app.core.testing_db import get_testing_db, get_testing_admin_db
import asyncio
import os

# Check if we're in testing mode (no Supabase credentials)
TESTING_MODE = False
try:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        TESTING_MODE = True
        print("⚠️  Using testing database mode (no Supabase credentials)")
    else:
        # Supabase client instance
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
except Exception as e:
    TESTING_MODE = True
    print(f"⚠️  Using testing database mode (Supabase error: {e})")

async def init_db():
    """Initialize database tables and extensions"""
    try:
        if TESTING_MODE:
            print("🧪 Using testing database mode")
            return
            
        # Test database connection by checking if our main tables exist
        result = supabase.table("users").select("id").limit(1).execute()
        
        print("✅ Database connection successful")
        print("� Connected to production Supabase database")
        print("""
-- Enable pgvector extension (run in Supabase SQL Editor)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    student_id VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR NOT NULL,
    department VARCHAR,
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create face_embeddings table with pgvector
CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    embedding VECTOR(512),
    image_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location_verified BOOLEAN DEFAULT false,
    network_ssid VARCHAR,
    device_ip INET,
    confidence_score FLOAT,
    liveness_passed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON face_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
        """)
        
    except Exception as e:
        print(f"⚠️ Database connection failed: {str(e)}")
        print("📝 Please check your Supabase credentials in .env file")
        # Don't raise the error, just warn - allow server to start for API testing

def get_db():
    """Get database client"""
    if TESTING_MODE:
        return get_testing_db()
    return supabase

def get_admin_db():
    """Get admin database client"""  
    if TESTING_MODE:
        return get_testing_admin_db()
    return supabase_admin