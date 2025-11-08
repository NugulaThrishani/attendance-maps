from app.core.database import supabase

def setup_network_config():
    """Insert network configurations if they don't exist"""
    print("Setting up network configurations...")
    
    networks = [
        {"ssid": "Dhanush", "ip_range": "192.168.43.0/24", "is_active": True},
        {"ssid": "DemoHotspot", "ip_range": "192.168.43.0/24", "is_active": True},
        {"ssid": "AttendanceDemo", "ip_range": "10.0.0.0/24", "is_active": True},
        {"ssid": "TestNetwork", "ip_range": "172.20.10.0/24", "is_active": True}
    ]
    
    try:
        # Check if networks already exist
        existing = supabase.table('network_config').select('ssid').execute()
        existing_ssids = [row['ssid'] for row in existing.data]
        
        for network in networks:
            if network['ssid'] not in existing_ssids:
                result = supabase.table('network_config').insert(network).execute()
                print(f"✅ Added network: {network['ssid']}")
            else:
                print(f"⚠️ Network already exists: {network['ssid']}")
                
        print("Network configuration setup complete!")
        
    except Exception as e:
        print(f"❌ Error setting up network config: {e}")

if __name__ == "__main__":
    setup_network_config()