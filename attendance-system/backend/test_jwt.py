#!/usr/bin/env python3
"""
Test JWT token decoding
"""
import jwt
import json
from datetime import datetime, timezone

# The JWT token from the user's request
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTRjMDM3MWQtZmQ2OC00MzkxLTg0ODctNzc5NThjZjZjN2MxIiwiZW1haWwiOiJkaGFudXNoYXYyMDA1QGdtYWlsLmNvbSIsImZhY3VsdHlfaWQiOiI0MDM0MyIsImV4cCI6MTc1ODIwNDA3Nn0.xjEr7qgPm7nUnI9gbM7oEn4ZP431TAlWGJ3g-JkE_gQ"

try:
    # Decode without verification first to see the payload
    decoded = jwt.decode(jwt_token, options={"verify_signature": False})
    print("JWT Payload:")
    print(json.dumps(decoded, indent=2))
    
    # Check expiration
    exp_timestamp = decoded.get("exp")
    if exp_timestamp:
        exp_time = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        current_time = datetime.now(timezone.utc)
        print(f"\nToken expires at: {exp_time}")
        print(f"Current time: {current_time}")
        print(f"Token is: {'VALID' if exp_time > current_time else 'EXPIRED'}")
    
except Exception as e:
    print(f"Error decoding token: {e}")