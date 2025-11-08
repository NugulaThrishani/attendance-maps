import asyncio
from app.core.database import supabase

async def check_tables():
    print("Checking database tables...")
    
    tables_to_check = ['users', 'face_embeddings', 'attendance', 'network_config']
    
    for table in tables_to_check:
        try:
            response = supabase.table(table).select('*').limit(1).execute()
            print(f"✅ Table '{table}' exists and accessible")
        except Exception as e:
            print(f"❌ Table '{table}' issue: {e}")
    
    # Check network_config data
    print("\nChecking network configuration:")
    try:
        response = supabase.table('network_config').select('*').execute()
        print(f"Network configs found: {len(response.data)}")
        for config in response.data:
            print(f"  - SSID: {config['ssid']}, IP Range: {config['ip_range']}")
    except Exception as e:
        print(f"Error checking network config: {e}")

if __name__ == "__main__":
    asyncio.run(check_tables())