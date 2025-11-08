# KL University Faculty Attendance System - API Testing Guide

## Quick Start

1. **Import Postman Collection**
   - Open Postman
   - Click Import → Upload Files
   - Select `postman-collection.json`
   - Collection will be imported with all endpoints

2. **Set Base URL**
   - In Postman, go to Collection Variables
   - Set `base_url` to `http://localhost:8000`

## Test Sequence

### 1. Authentication Flow

**Step 1: Register Faculty**
```http
POST http://localhost:8000/auth/register
Content-Type: application/json

{
  "email": "dr.john.doe@klu.edu",
  "faculty_id": "KLU_FAC_001", 
  "full_name": "Dr. John Doe",
  "department": "Computer Science",
  "designation": "Professor",
  "password": "SecurePassword123!"
}
```

**Step 2: Login Faculty**
```http
POST http://localhost:8000/auth/login
Content-Type: application/x-www-form-urlencoded

username=dr.john.doe@klu.edu
password=SecurePassword123!
```

**Step 3: Get Faculty Info**
```http
GET http://localhost:8000/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### 2. Attendance Flow

**Mark Attendance**
```http
POST http://localhost:8000/attendance/mark
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "face_image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "network_ssid": "DemoHotspot",
  "device_ip": "192.168.43.101"
}
```

**Get Attendance History**
```http
GET http://localhost:8000/attendance/history/KLU_FAC_001
Authorization: Bearer YOUR_JWT_TOKEN
```

### 3. Admin Dashboard

**Get Statistics**
```http
GET http://localhost:8000/admin/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

**Get All Faculty**
```http
GET http://localhost:8000/admin/faculty
Authorization: Bearer YOUR_JWT_TOKEN
```

## Sample Test Data

### Faculty Registration Samples
```json
[
  {
    "email": "dr.john.doe@klu.edu",
    "faculty_id": "KLU_FAC_001",
    "full_name": "Dr. John Doe", 
    "department": "Computer Science",
    "designation": "Professor",
    "password": "SecurePassword123!"
  },
  {
    "email": "dr.jane.smith@klu.edu",
    "faculty_id": "KLU_FAC_002",
    "full_name": "Dr. Jane Smith",
    "department": "Information Technology", 
    "designation": "Associate Professor",
    "password": "MyPassword456!"
  }
]
```

### Network Configuration for Testing
- **DemoHotspot**: IP Range `192.168.43.0/24`
- **AttendanceDemo**: IP Range `10.0.0.0/24` 
- **TestNetwork**: IP Range `172.20.10.0/24`

## Expected Response Codes

| Endpoint | Success | Error Cases |
|----------|---------|-------------|
| POST /auth/register | 201 | 400 (validation), 409 (duplicate) |
| POST /auth/login | 200 | 401 (invalid credentials) |
| GET /auth/me | 200 | 401 (unauthorized) |
| POST /attendance/mark | 200 | 400 (invalid data), 401 (unauthorized) |
| GET /attendance/history | 200 | 401 (unauthorized), 404 (not found) |
| GET /admin/stats | 200 | 401 (unauthorized) |

## Testing Checklist

### ✅ Authentication Tests
- [ ] Register new faculty with valid data
- [ ] Register with invalid email format (should fail)
- [ ] Register with duplicate faculty_id (should fail)
- [ ] Login with valid credentials 
- [ ] Login with invalid credentials (should fail)
- [ ] Access protected endpoints with valid token
- [ ] Access protected endpoints without token (should fail)

### ✅ Attendance Tests
- [ ] Mark attendance with valid face image and network
- [ ] Mark attendance with unauthorized network (should fail)
- [ ] Mark attendance with invalid IP range (should fail)
- [ ] Get attendance history for valid faculty
- [ ] Get today's attendance for valid faculty
- [ ] Access attendance endpoints without auth (should fail)

### ✅ Admin Tests
- [ ] Get overall statistics
- [ ] Get attendance logs with pagination
- [ ] Get all faculty members
- [ ] Verify admin endpoints require authentication

## Environment Setup

### Supabase Database
Before testing, run the SQL from `database_setup.sql` in your Supabase SQL Editor.

### Environment Variables (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  
SECRET_KEY=your_jwt_secret_key_here
```

## Interactive API Documentation
Visit http://localhost:8000/docs for Swagger UI with all endpoints documented.

## Troubleshooting

### Common Issues
1. **Database Connection Failed**
   - Check Supabase credentials in .env
   - Verify database tables are created

2. **Authentication Errors**
   - Check JWT token format
   - Verify token hasn't expired

3. **Face Recognition Errors**
   - Ensure face image is valid base64
   - Check TensorFlow/DeepFace installation

4. **Network Verification Errors**
   - Verify SSID is in allowed networks
   - Check IP is in configured range

### Debug Endpoints
- `GET /` - Health check
- `GET /docs` - API documentation
- `GET /redoc` - Alternative API docs