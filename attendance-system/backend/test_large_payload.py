#!/usr/bin/env python3
"""
Test with larger payload to simulate real usage
"""
import requests
import json
import base64
from PIL import Image, ImageDraw
import io

# The JWT token from the user's request
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTRjMDM3MWQtZmQ2OC00MzkxLTg0ODctNzc5NThjZjZjN2MxIiwiZW1haWwiOiJkaGFudXNoYXYyMDA1QGdtYWlsLmNvbSIsImZhY3VsdHlfaWQiOiI0MDM0MyIsImV4cCI6MTc1ODIwNDA3Nn0.xjEr7qgPm7nUnI9gbM7oEn4ZP431TAlWGJ3g-JkE_gQ"

def create_test_face_image(size=(640, 480)):
    """Create a test image with a simple face-like drawing"""
    # Create a new RGB image
    img = Image.new('RGB', size, color='lightblue')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple face
    face_center = (size[0]//2, size[1]//2)
    face_radius = min(size[0], size[1]) // 4
    
    # Face circle
    draw.ellipse([
        face_center[0] - face_radius,
        face_center[1] - face_radius,
        face_center[0] + face_radius,
        face_center[1] + face_radius
    ], fill='peachpuff', outline='black', width=2)
    
    # Eyes
    eye_radius = face_radius // 8
    left_eye = (face_center[0] - face_radius//3, face_center[1] - face_radius//3)
    right_eye = (face_center[0] + face_radius//3, face_center[1] - face_radius//3)
    
    for eye in [left_eye, right_eye]:
        draw.ellipse([
            eye[0] - eye_radius,
            eye[1] - eye_radius,
            eye[0] + eye_radius,
            eye[1] + eye_radius
        ], fill='black')
    
    # Mouth
    mouth_center = (face_center[0], face_center[1] + face_radius//3)
    mouth_width = face_radius//2
    mouth_height = face_radius//6
    
    draw.arc([
        mouth_center[0] - mouth_width//2,
        mouth_center[1] - mouth_height//2,
        mouth_center[0] + mouth_width//2,
        mouth_center[1] + mouth_height//2
    ], start=0, end=180, fill='black', width=3)
    
    return img

def image_to_base64_uri(image):
    """Convert PIL image to base64 data URI"""
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=85)
    image_bytes = buffer.getvalue()
    base64_string = base64.b64encode(image_bytes).decode('utf-8')
    return f"data:image/jpeg;base64,{base64_string}"

def test_with_large_payload():
    """Test with a larger, more realistic payload"""
    # Create test images
    live_image = create_test_face_image((800, 600))
    live_image_b64 = image_to_base64_uri(live_image)
    
    # Create liveness sequence
    liveness_sequence = []
    for i in range(5):
        # Create slightly different images for liveness
        size = (640 + i*10, 480 + i*10)  # Slight size variation
        liveness_img = create_test_face_image(size)
        liveness_sequence.append(image_to_base64_uri(liveness_img))
    
    test_payload = {
        "live_image": live_image_b64,
        "network_info": {
            "ssid": "KLU-WiFi",
            "bssid": "00:11:22:33:44:55",
            "security": "WPA2",
            "signal_strength": -45,
            "connection_type": "wifi"
        },
        "liveness_sequence": liveness_sequence,
        "device_info": {
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "platform": "Windows",
            "screen_resolution": "1920x1080"
        },
        "gps_coordinates": {
            "latitude": 16.4419,
            "longitude": 80.9864
        }
    }

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    try:
        print(f"Testing POST http://localhost:8000/attendance/verify")
        print(f"Payload size: {len(json.dumps(test_payload))/1024:.1f} KB")
        print(f"Live image size: {len(live_image_b64)/1024:.1f} KB")
        print(f"Liveness sequence count: {len(liveness_sequence)}")
        
        response = requests.post("http://localhost:8000/attendance/verify", 
                               json=test_payload, 
                               headers=headers,
                               timeout=30)  # 30 second timeout
        
        print(f"Response Status Code: {response.status_code}")
        
        if response.status_code == 500:
            print("❌ 500 Internal Server Error occurred!")
            try:
                error_details = response.json()
                print(f"Error Details: {json.dumps(error_details, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
        elif response.status_code == 200:
            print("✅ Request successful!")
            try:
                result = response.json()
                print(f"Success: {result.get('success')}")
                print(f"Message: {result.get('message')}")
                if result.get('verification_details'):
                    face_verification = result['verification_details'].get('face_verification', {})
                    print(f"Face verification: {face_verification}")
            except:
                print(f"Raw Response: {response.text[:500]}...")
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            try:
                error_details = response.json()
                print(f"Error Details: {json.dumps(error_details, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
                
    except requests.exceptions.Timeout:
        print("❌ Request timed out!")
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")

if __name__ == "__main__":
    test_with_large_payload()