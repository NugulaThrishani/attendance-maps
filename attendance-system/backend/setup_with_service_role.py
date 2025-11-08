import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def setup_with_service_role():
    """Setup using service role key to bypass RLS"""
    
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    # Create client with service role (bypasses RLS)
    supabase: Client = create_client(url, service_key)
    
    print("Setting up network configurations with service role...")
    
    networks = [
        {"ssid": "Dhanush", "ip_range": "192.168.43.0/24", "is_active": True},
        {"ssid": "DemoHotspot", "ip_range": "192.168.43.0/24", "is_active": True},
        {"ssid": "AttendanceDemo", "ip_range": "10.0.0.0/24", "is_active": True},
        {"ssid": "TestNetwork", "ip_range": "172.20.10.0/24", "is_active": True}
    ]
    
    try:
        # Check existing networks
        existing = supabase.table('network_config').select('ssid').execute()
        existing_ssids = [row['ssid'] for row in existing.data]
        print(f"Found {len(existing_ssids)} existing networks: {existing_ssids}")
        
        for network in networks:
            if network['ssid'] not in existing_ssids:
                result = supabase.table('network_config').insert(network).execute()
                print(f"✅ Added network: {network['ssid']}")
            else:
                print(f"⚠️ Network already exists: {network['ssid']}")
                
        # Verify the setup
        all_networks = supabase.table('network_config').select('*').execute()
        print(f"\n✅ Network configuration complete! Total networks: {len(all_networks.data)}")
        for net in all_networks.data:
            print(f"  - {net['ssid']}: {net['ip_range']}")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    setup_with_service_role()