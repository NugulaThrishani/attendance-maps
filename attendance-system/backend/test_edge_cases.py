#!/usr/bin/env python3
"""
Comprehensive test for edge cases that could cause 500 errors
"""
import requests
import json

# The JWT token from the user's request
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTRjMDM3MWQtZmQ2OC00MzkxLTg0ODctNzc5NThjZjZjN2MxIiwiZW1haWwiOiJkaGFudXNoYXYyMDA1QGdtYWlsLmNvbSIsImZhY3VsdHlfaWQiOiI0MDM0MyIsImV4cCI6MTc1ODIwNDA3Nn0.xjEr7qgPm7nUnI9gbM7oEn4ZP431TAlWGJ3g-JkE_gQ"

def test_edge_case(test_name, payload, expected_status=200):
    """Test a specific payload and report results"""
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    print(f"\n🧪 Testing: {test_name}")
    try:
        response = requests.post("http://localhost:8000/attendance/verify", 
                               json=payload, 
                               headers=headers,
                               timeout=10)
        
        print(f"   Status: {response.status_code} (expected: {expected_status})")
        
        if response.status_code == 500:
            print("   ❌ 500 Internal Server Error!")
            try:
                error_details = response.json()
                print(f"   Error: {error_details.get('detail', 'No detail')}")
            except:
                print(f"   Raw Error: {response.text[:200]}...")
        elif response.status_code == expected_status:
            print("   ✅ Expected status code")
            if response.status_code == 200:
                try:
                    result = response.json()
                    print(f"   Success: {result.get('success')}")
                    print(f"   Message: {result.get('message', '')[:100]}...")
                except:
                    pass
        else:
            print(f"   ⚠️ Unexpected status: {response.status_code}")
            
    except requests.exceptions.Timeout:
        print("   ❌ Request timed out")
    except Exception as e:
        print(f"   ❌ Request failed: {str(e)}")

def run_edge_case_tests():
    """Run various edge case tests"""
    
    # Test 1: Corrupted base64 image
    test_edge_case("Corrupted base64 image", {
        "live_image": "data:image/jpeg;base64,invalid_base64_data!!!",
        "network_info": {"ssid": "KLU-WiFi"},
        "liveness_sequence": []
    })
    
    # Test 2: Valid base64 but not an image
    test_edge_case("Valid base64 but not image", {
        "live_image": "data:image/jpeg;base64,SGVsbG8gV29ybGQ=",  # "Hello World"
        "network_info": {"ssid": "KLU-WiFi"},
        "liveness_sequence": []
    })
    
    # Test 3: Extremely large base64 string (simulate very large image)
    large_data = "data:image/jpeg;base64," + "A" * 1000000  # ~1MB of A's
    test_edge_case("Very large payload", {
        "live_image": large_data,
        "network_info": {"ssid": "KLU-WiFi"},
        "liveness_sequence": []
    })
    
    # Test 4: Empty network_info
    test_edge_case("Empty network_info", {
        "live_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "network_info": {},
        "liveness_sequence": []
    })
    
    # Test 5: Missing required fields
    test_edge_case("Missing live_image", {
        "network_info": {"ssid": "KLU-WiFi"},
        "liveness_sequence": []
    }, expected_status=422)  # Validation error expected
    
    # Test 6: Malformed liveness sequence  
    test_edge_case("Malformed liveness sequence", {
        "live_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "network_info": {"ssid": "KLU-WiFi"},
        "liveness_sequence": ["not_base64", "also_not_base64"]
    })
    
    # Test 7: Very long liveness sequence
    long_sequence = ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="] * 50
    test_edge_case("Very long liveness sequence", {
        "live_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "network_info": {"ssid": "KLU-WiFi"},
        "liveness_sequence": long_sequence
    })
    
    # Test 8: Invalid JWT token
    print(f"\n🧪 Testing: Invalid JWT token")
    headers = {
        "Authorization": "Bearer invalid_jwt_token",
        "Content-Type": "application/json"
    }
    try:
        response = requests.post("http://localhost:8000/attendance/verify", 
                               json={
                                   "live_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                                   "network_info": {"ssid": "KLU-WiFi"},
                                   "liveness_sequence": []
                               }, 
                               headers=headers,
                               timeout=5)
        print(f"   Status: {response.status_code} (expected: 401)")
    except Exception as e:
        print(f"   ❌ Request failed: {str(e)}")

if __name__ == "__main__":
    run_edge_case_tests()