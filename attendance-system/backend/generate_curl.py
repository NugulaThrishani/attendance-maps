#!/usr/bin/env python3
"""
Simple curl test
"""

import subprocess
import json

# JWT token
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTRjMDM3MWQtZmQ2OC00MzkxLTg0ODctNzc5NThjZjZjN2MxIiwiZW1haWwiOiJkaGFudXNoYXYyMDA1QGdtYWlsLmNvbSIsImZhY3VsdHlfaWQiOiI0MDM0MyIsImV4cCI6MTc1ODIwNDA3Nn0.xjEr7qgPm7nUnI9gbM7oEn4ZP431TAlWGJ3g-JkE_gQ"

# Create minimal test payload
payload = {
    "live_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "network_info": {"ssid": "KLU-WiFi"},
    "liveness_sequence": []
}

# Create curl command
curl_cmd = [
    'curl', '-X', 'POST',
    'http://localhost:8000/attendance/verify',
    '-H', 'Content-Type: application/json',
    '-H', f'Authorization: Bearer {jwt_token}',
    '-d', json.dumps(payload),
    '-v'  # verbose output
]

print("Generated curl command:")
print(' '.join(curl_cmd))
print("\nYou can run this manually after starting the server:")