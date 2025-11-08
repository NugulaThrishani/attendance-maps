import asyncio
from app.core.database import supabase

async def test_connection():
    print("Testing Supabase connection...")
    
    try:
        # Test basic connection
        response = supabase.table('users').select('*').limit(1).execute()
        print("✅ Database connection successful!")
        print(f"Response: {response}")
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("This might mean:")
        print("1. Tables haven't been created yet")
        print("2. Wrong credentials in .env")
        print("3. Supabase project not accessible")
        
        # Try a simpler test
        try:
            # Test if we can access Supabase at all
            response = supabase.auth.get_user()
            print("✅ Basic Supabase auth connection works")
        except Exception as auth_e:
            print(f"❌ Even basic Supabase connection failed: {auth_e}")

if __name__ == "__main__":
    asyncio.run(test_connection())