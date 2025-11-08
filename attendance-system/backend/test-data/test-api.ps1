# PowerShell script for testing Faculty Attendance System API on Windows

$BASE_URL = "http://localhost:8000"

Write-Host "=== KL University Faculty Attendance System API Tests ===" -ForegroundColor Green

# 1. REGISTER A NEW FACULTY MEMBER
Write-Host "`n=== Registering Faculty ===" -ForegroundColor Yellow
$registerBody = @{
    email = "dr.john.doe@klu.edu"
    faculty_id = "KLU_FAC_001"
    full_name = "Dr. John Doe"
    department = "Computer Science"
    designation = "Professor"
    password = "SecurePassword123!"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "Registration successful:" -ForegroundColor Green
    $registerResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Registration failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. LOGIN TO GET ACCESS TOKEN
Write-Host "`n=== Faculty Login ===" -ForegroundColor Yellow
$loginBody = @{
    username = "dr.john.doe@klu.edu"
    password = "SecurePassword123!"
}

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    $TOKEN = $loginResponse.access_token
    Write-Host "Login successful. Token obtained." -ForegroundColor Green
    Write-Host "Faculty ID: $($loginResponse.faculty_id)" -ForegroundColor Cyan
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. GET CURRENT FACULTY INFO
Write-Host "`n=== Get Faculty Info ===" -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $TOKEN"
}

try {
    $facultyInfo = Invoke-RestMethod -Uri "$BASE_URL/auth/me" -Method GET -Headers $headers
    Write-Host "Faculty Info retrieved:" -ForegroundColor Green
    $facultyInfo | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to get faculty info: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. VERIFY TOKEN
Write-Host "`n=== Verify Token ===" -ForegroundColor Yellow
try {
    $tokenVerify = Invoke-RestMethod -Uri "$BASE_URL/auth/verify-token" -Method GET -Headers $headers
    Write-Host "Token verification:" -ForegroundColor Green
    $tokenVerify | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Token verification failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. MARK ATTENDANCE
Write-Host "`n=== Mark Attendance ===" -ForegroundColor Yellow
$attendanceBody = @{
    face_image_base64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
    network_ssid = "DemoHotspot"
    device_ip = "192.168.43.101"
} | ConvertTo-Json

try {
    $attendanceResponse = Invoke-RestMethod -Uri "$BASE_URL/attendance/mark" -Method POST -Body $attendanceBody -ContentType "application/json" -Headers $headers
    Write-Host "Attendance marked successfully:" -ForegroundColor Green
    $attendanceResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to mark attendance: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. GET ATTENDANCE HISTORY
Write-Host "`n=== Get Attendance History ===" -ForegroundColor Yellow
try {
    $historyResponse = Invoke-RestMethod -Uri "$BASE_URL/attendance/history/KLU_FAC_001" -Method GET -Headers $headers
    Write-Host "Attendance History:" -ForegroundColor Green
    $historyResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to get attendance history: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. GET TODAY'S ATTENDANCE
Write-Host "`n=== Get Today's Attendance ===" -ForegroundColor Yellow
try {
    $todayResponse = Invoke-RestMethod -Uri "$BASE_URL/attendance/today/KLU_FAC_001" -Method GET -Headers $headers
    Write-Host "Today's Attendance:" -ForegroundColor Green
    $todayResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to get today's attendance: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. GET ADMIN STATISTICS
Write-Host "`n=== Get Admin Statistics ===" -ForegroundColor Yellow
try {
    $statsResponse = Invoke-RestMethod -Uri "$BASE_URL/admin/stats" -Method GET -Headers $headers
    Write-Host "Admin Statistics:" -ForegroundColor Green
    $statsResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to get admin statistics: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. GET ALL FACULTY (ADMIN)
Write-Host "`n=== Get All Faculty ===" -ForegroundColor Yellow
try {
    $facultyResponse = Invoke-RestMethod -Uri "$BASE_URL/admin/faculty" -Method GET -Headers $headers
    Write-Host "All Faculty Members:" -ForegroundColor Green
    $facultyResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to get faculty list: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. GET ATTENDANCE LOGS (ADMIN)
Write-Host "`n=== Get Attendance Logs ===" -ForegroundColor Yellow
try {
    $logsResponse = Invoke-RestMethod -Uri "$BASE_URL/admin/attendance-logs?limit=10&offset=0" -Method GET -Headers $headers
    Write-Host "Attendance Logs:" -ForegroundColor Green
    $logsResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to get attendance logs: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Green
Write-Host "Visit http://localhost:8000/docs for interactive API documentation" -ForegroundColor Cyan

# Additional test with multiple faculty registrations
Write-Host "`n=== Registering Additional Faculty for Testing ===" -ForegroundColor Yellow

$additionalFaculty = @(
    @{
        email = "dr.jane.smith@klu.edu"
        faculty_id = "KLU_FAC_002" 
        full_name = "Dr. Jane Smith"
        department = "Information Technology"
        designation = "Associate Professor"
        password = "MyPassword456!"
    },
    @{
        email = "dr.bob.johnson@klu.edu"
        faculty_id = "KLU_FAC_003"
        full_name = "Dr. Bob Johnson"
        department = "Electronics and Communication"
        designation = "Assistant Professor"
        password = "StrongPass789!"
    }
)

foreach ($faculty in $additionalFaculty) {
    $facultyJson = $faculty | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method POST -Body $facultyJson -ContentType "application/json"
        Write-Host "Registered: $($faculty.full_name)" -ForegroundColor Green
    } catch {
        Write-Host "Failed to register $($faculty.full_name): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`nAll API tests completed!" -ForegroundColor Green