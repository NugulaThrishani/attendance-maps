#!/usr/bin/env python3
"""
Test script to reproduce the 500 error on /attendance/verify endpoint
"""
import requests
import json
import base64

# The JWT token from the user's request
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTRjMDM3MWQtZmQ2OC00MzkxLTg0ODctNzc5NThjZjZjN2MxIiwiZW1haWwiOiJkaGFudXNoYXYyMDA1QGdtYWlsLmNvbSIsImZhY3VsdHlfaWQiOiI0MDM0MyIsImV4cCI6MTc1ODIwNDA3Nn0.xjEr7qgPm7nUnI9gbM7oEn4ZP431TAlWGJ3g-JkE_gQ"

# Create a minimal request payload
test_payload = {
    "live_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",  # Minimal 1x1 pixel PNG with data URI
    "network_info": {
        "ssid": "KLU-WiFi",
        "security": "WPA2",
        "signal_strength": -45
    },
    "liveness_sequence": []
}

headers = {
    "Authorization": f"Bearer {jwt_token}",
    "Content-Type": "application/json"
}

def test_attendance_verify():
    """Test the /attendance/verify endpoint"""
    url = "http://localhost:8000/attendance/verify"
    
    try:
        print(f"Testing POST {url}")
        print(f"Headers: {headers}")
        print(f"Payload size: {len(json.dumps(test_payload))} bytes")
        
        response = requests.post(url, json=test_payload, headers=headers)
        
        print(f"Response Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 500:
            print("❌ 500 Internal Server Error occurred!")
            try:
                error_details = response.json()
                print(f"Error Details: {json.dumps(error_details, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
        else:
            print("✅ Request successful!")
            try:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")

if __name__ == "__main__":
    test_attendance_verify()