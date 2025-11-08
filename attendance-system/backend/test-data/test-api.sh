# Sample cURL commands for testing the Faculty Attendance System

# Set your base URL
BASE_URL="http://localhost:8000"

# 1. REGISTER A NEW FACULTY MEMBER
echo "=== Registering Faculty ==="
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.john.doe@klu.edu",
    "faculty_id": "KLU_FAC_001",
    "full_name": "Dr. John Doe",
    "department": "Computer Science", 
    "designation": "Professor",
    "password": "SecurePassword123!"
  }'

echo -e "\n\n"

# 2. LOGIN TO GET ACCESS TOKEN
echo "=== Faculty Login ==="
RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=dr.john.doe@klu.edu&password=SecurePassword123!")

echo $RESPONSE

# Extract token (you'll need to manually copy this for next commands)
TOKEN=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "REPLACE_WITH_ACTUAL_TOKEN")

echo -e "\n\n"

# 3. GET CURRENT FACULTY INFO
echo "=== Get Faculty Info ==="
curl -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"

# 4. VERIFY TOKEN
echo "=== Verify Token ==="
curl -X GET "$BASE_URL/auth/verify-token" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"

# 5. MARK ATTENDANCE
echo "=== Mark Attendance ==="
curl -X POST "$BASE_URL/attendance/mark" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "face_image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
    "network_ssid": "DemoHotspot", 
    "device_ip": "192.168.43.101"
  }'

echo -e "\n\n"

# 6. GET ATTENDANCE HISTORY
echo "=== Get Attendance History ==="
curl -X GET "$BASE_URL/attendance/history/KLU_FAC_001" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"

# 7. GET TODAY'S ATTENDANCE
echo "=== Get Today's Attendance ==="
curl -X GET "$BASE_URL/attendance/today/KLU_FAC_001" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"

# 8. GET ADMIN STATISTICS
echo "=== Get Admin Statistics ==="
curl -X GET "$BASE_URL/admin/stats" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"

# 9. GET ALL FACULTY (ADMIN)
echo "=== Get All Faculty ==="
curl -X GET "$BASE_URL/admin/faculty" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"

# 10. GET ATTENDANCE LOGS (ADMIN)
echo "=== Get Attendance Logs ==="
curl -X GET "$BASE_URL/admin/attendance-logs?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"

echo "=== Testing Complete ==="
echo "Note: Replace $TOKEN with the actual token from login response"
echo "Visit http://localhost:8000/docs for interactive API documentation"