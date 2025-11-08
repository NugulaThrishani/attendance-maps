#!/usr/bin/env python3
"""
Test face recognition improvements
"""
import requests
import json

# JWT token  
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTRjMDM3MWQtZmQ2OC00MzkxLTg0ODctNzc5NThjZjZjN2MxIiwiZW1haWwiOiJkaGFudXNoYXYyMDA1QGdtYWlsLmNvbSIsImZhY3VsdHlfaWQiOiI0MDM0MyIsImV4cCI6MTc1ODIwNDA3Nn0.xjEr7qgPm7nUnI9gbM7oEn4ZP431TAlWGJ3g-JkE_gQ"

def test_face_recognition_endpoint():
    """Test the new face recognition test endpoint"""
    
    test_payload = {
        "live_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "network_info": {"ssid": "KLU-WiFi"},
        "liveness_sequence": []
    }

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    try:
        print("🧪 Testing face recognition endpoint...")
        response = requests.post("http://localhost:8000/attendance/test-face-recognition", 
                               json=test_payload, 
                               headers=headers,
                               timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Face Recognition Test Results:")
            print(f"   Success: {result.get('success')}")
            print(f"   Message: {result.get('message')}")
            print(f"   Embeddings Count: {result.get('embeddings_count', 0)}")
            print(f"   Valid Embeddings: {result.get('valid_embeddings', 0)}")
            
            if result.get('face_verification'):
                face_result = result['face_verification']
                print(f"   Face Match: {face_result.get('match', False)}")
                print(f"   Confidence: {face_result.get('confidence', 0):.4f}")
                print(f"   Threshold: {face_result.get('threshold', 0):.4f}")
                print(f"   Dynamic Threshold Applied: {face_result.get('dynamic_threshold_applied', False)}")
            
            if result.get('recommendations'):
                recs = result['recommendations']
                print(f"   Status: {recs.get('status', 'UNKNOWN')}")
                print("   Suggestions:")
                for suggestion in recs.get('suggestions', []):
                    if suggestion:
                        print(f"     - {suggestion}")
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error = response.json()
                print(f"   Details: {error}")
            except:
                print(f"   Raw: {response.text}")
                
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")

def test_attendance_verification():
    """Test actual attendance verification with improvements"""
    
    test_payload = {
        "live_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "network_info": {"ssid": "KLU-WiFi"},
        "liveness_sequence": []
    }

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    try:
        print("\n🎯 Testing attendance verification with improvements...")
        response = requests.post("http://localhost:8000/attendance/verify", 
                               json=test_payload, 
                               headers=headers,
                               timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Attendance Verification:")
            print(f"   Success: {result.get('success')}")
            print(f"   Message: {result.get('message')}")
            
            if result.get('verification_details', {}).get('face_verification'):
                face_result = result['verification_details']['face_verification']
                print(f"   Face Match: {face_result.get('match', False)}")
                print(f"   Confidence: {face_result.get('confidence', 0):.4f}")
                print(f"   Threshold: {face_result.get('threshold', 0):.4f}")
                print(f"   Dynamic Threshold Applied: {face_result.get('dynamic_threshold_applied', False)}")
        else:
            print(f"❌ Error: {response.status_code}")
                
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")

if __name__ == "__main__":
    test_face_recognition_endpoint()
    test_attendance_verification()