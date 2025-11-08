#!/usr/bin/env python3
"""
Simple test to check server status
"""
import requests
import time

def test_server_health():
    """Test if server is running"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        print(f"Server health check: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            return True
    except Exception as e:
        print(f"Server not responding: {str(e)}")
    return False

def wait_for_server(max_wait=30):
    """Wait for server to be ready"""
    print("Waiting for server to be ready...")
    for i in range(max_wait):
        if test_server_health():
            print("✅ Server is ready!")
            return True
        print(f"⏳ Waiting... ({i+1}/{max_wait})")
        time.sleep(1)
    print("❌ Server did not start in time")
    return False

if __name__ == "__main__":
    wait_for_server()