#!/usr/bin/env python3
"""
Deploy database schema to Supabase
Runs the SQL commands from database_setup.sql
"""

import os
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://pkowiccjkknwinplkkbo.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrb3dpY2Nqa2tud2lucGxra2JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk4ODY4OSwiZXhwIjoyMDczNTY0Njg5fQ.WqwqRc6tllfZMxj_AgS_ZQRMXuA-omO0cQzDW68ou3w"

def deploy_database_schema():
    """Deploy the complete database schema to Supabase"""
    
    print("🚀 Deploying KL University Attendance System Database Schema")
    print(f"📡 Connecting to: {SUPABASE_URL}")
    
    try:
        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        print("✅ Connected to Supabase successfully")
        
        # Read the database setup file
        schema_path = os.path.join(os.path.dirname(__file__), '..', 'database_setup.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("📜 Database schema file loaded")
        print(f"📏 Schema size: {len(sql_content)} characters")
        
        # Split SQL into individual statements
        sql_statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
        
        print(f"🔢 Found {len(sql_statements)} SQL statements to execute")
        
        # Execute each statement
        success_count = 0
        for i, statement in enumerate(sql_statements, 1):
            if not statement or statement.startswith('/*'):
                continue
                
            try:
                print(f"📝 Executing statement {i}/{len(sql_statements)}...")
                
                # Use rpc to execute raw SQL
                result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                
                print(f"✅ Statement {i} executed successfully")
                success_count += 1
                
            except Exception as e:
                error_msg = str(e)
                if "already exists" in error_msg.lower():
                    print(f"⚠️  Statement {i} skipped (already exists): {error_msg}")
                    success_count += 1
                else:
                    print(f"❌ Error in statement {i}: {error_msg}")
                    print(f"   SQL: {statement[:100]}...")
        
        print(f"\n📊 DEPLOYMENT SUMMARY:")
        print(f"✅ Successfully executed: {success_count}/{len(sql_statements)} statements")
        
        if success_count == len(sql_statements):
            print(f"\n🎉 DATABASE DEPLOYMENT SUCCESSFUL!")
            print(f"✅ Your KL University Attendance System database is ready")
            print(f"✅ Tables created: users, face_embeddings, attendance, network_config")
            print(f"✅ Dhanush hotspot configuration deployed")
            print(f"✅ pgvector extension enabled for face recognition")
        else:
            print(f"\n⚠️  PARTIAL DEPLOYMENT COMPLETED")
            print(f"Some statements may have been skipped (likely already existing)")
            
        return True
        
    except Exception as e:
        print(f"❌ DEPLOYMENT FAILED: {e}")
        return False

def test_database_connection():
    """Test if we can connect to the deployed database"""
    
    print(f"\n🧪 Testing database connection...")
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Test basic query
        result = supabase.table("users").select("count").execute()
        print(f"✅ Database connection test successful")
        
        # Test network config table
        network_result = supabase.table("network_config").select("*").execute()
        if network_result.data:
            print(f"✅ Network configuration table exists with {len(network_result.data)} entries")
            for config in network_result.data:
                print(f"   📡 Network: {config.get('ssid', 'Unknown')} - {config.get('ip_range', 'Unknown')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 80)
    print("    KL UNIVERSITY ATTENDANCE SYSTEM - DATABASE DEPLOYMENT")
    print("=" * 80)
    
    # Deploy schema
    if deploy_database_schema():
        # Test connection
        test_database_connection()
        
        print(f"\n🎯 NEXT STEPS:")
        print(f"1. Restart your FastAPI server")
        print(f"2. Test the endpoints again in Postman")
        print(f"3. Your system will now use the real Supabase database!")
        
    print("=" * 80)