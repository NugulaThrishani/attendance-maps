# KL University Attendance System - FastAPI Backend

## Overview
Real face recognition-based attendance system with Wi-Fi verification for KL University. No mock data - everything works with real AI models and authentication.

## Features
- ✅ **Real Face Recognition** using DeepFace with FaceNet512 model
- ✅ **Liveness Detection** using MediaPipe and eye aspect ratio
- ✅ **Mobile Hotspot Verification** for prototype testing
- ✅ **JWT Authentication** with secure token management
- ✅ **Supabase Integration** with pgvector for embedding storage
- ✅ **Real-time Attendance** tracking and logging
- ✅ **Admin Dashboard APIs** for monitoring and analytics

## Tech Stack
- **FastAPI** - High-performance async web framework
- **DeepFace** - Face recognition with multiple model backends
- **MediaPipe** - Liveness detection and face processing
- **Supabase** - Database, authentication, and storage
- **pgvector** - Vector similarity search for face embeddings
- **JWT** - Secure authentication tokens
- **Docker** - Containerized deployment

## Setup Instructions

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
# Get these from https://supabase.com/dashboard
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Set JWT secret (generate a strong random string)
JWT_SECRET_KEY=your_super_secure_jwt_secret_key_here

# Configure allowed networks for your mobile hotspot
ALLOWED_SSIDS=["YourPhoneHotspot", "AttendanceDemo"]
ALLOWED_IP_RANGES=["192.168.43.0/24", "10.0.0.0/24"]
```

### 2. Install Dependencies
```bash
# Install Python dependencies
pip install -r requirements.txt

# Or for development
pip install -r requirements-dev.txt
```

### 3. Run the Server
```bash
# Development server
python main.py

# Or with uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Production with gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### 4. Docker Deployment
```bash
# Build Docker image
docker build -t klu-attendance-backend .

# Run container
docker run -p 8000:8000 --env-file .env klu-attendance-backend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user with face images
- `POST /api/auth/login` - Login with email and student ID
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/verify-token` - Verify JWT token

### Attendance
- `POST /api/attendance/verify` - Mark attendance with face + network verification
- `GET /api/attendance/my-records` - Get user's attendance history
- `GET /api/attendance/today-summary` - Get today's attendance summary
- `POST /api/attendance/verify-network` - Test network verification
- `GET /api/attendance/network-requirements` - Get network requirements

### Admin
- `GET /api/admin/stats` - System statistics and metrics
- `GET /api/admin/attendance-logs` - All attendance logs with filtering
- `GET /api/admin/users` - List all users
- `GET /api/admin/dashboard-summary` - Dashboard overview
- `GET /api/admin/network-config` - Network configuration

## How It Works

### 1. User Registration
```python
# Frontend sends 3-10 face images
face_images = ["data:image/jpeg;base64,/9j/4AAQ...", ...]

# Backend extracts face embeddings using DeepFace
embeddings = face_recognition_service.extract_embedding(image)

# Store embeddings in Supabase with pgvector
supabase.table("face_embeddings").insert({
    "user_id": user_id,
    "embedding": embedding_vector
})
```

### 2. Attendance Verification
```python
# 1. Network verification (mobile hotspot)
network_result = verify_network_access(network_info, client_ip)

# 2. Liveness detection (blink patterns)
liveness_result = detect_liveness(image_sequence)

# 3. Face verification (cosine similarity)
face_result = verify_faces(live_image, stored_embeddings)

# 4. Record attendance if all checks pass
if all_verifications_passed:
    record_attendance(user_id, verification_details)
```

### 3. Mobile Hotspot Verification
```python
# Verify SSID patterns
allowed_patterns = [".*hotspot.*", ".*demo.*", "AttendanceDemo"]

# Check IP ranges (typical hotspot ranges)
hotspot_ranges = ["192.168.43.0/24", "172.20.10.0/24", "10.0.0.0/24"]

# Combined verification
network_verified = ssid_match or ip_range_match
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    student_id VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR NOT NULL,
    department VARCHAR,
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
```

### Face Embeddings Table
```sql
CREATE TABLE face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    embedding VECTOR(512),  -- pgvector for similarity search
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Attendance Table
```sql
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location_verified BOOLEAN,
    network_ssid VARCHAR,
    device_ip INET,
    confidence_score FLOAT,
    liveness_passed BOOLEAN
);
```

## Mobile Hotspot Testing

### Setup Your Phone
1. Enable mobile hotspot on your phone
2. Set hotspot name to "AttendanceDemo" or update `.env`
3. Note the IP range (usually 192.168.43.x for Android)

### Test Sequence
1. Connect laptop/test device to your hotspot
2. Start backend: `python main.py`
3. Register user: `POST /api/auth/register` with face images
4. Mark attendance: `POST /api/attendance/verify`
5. Check logs: `GET /api/admin/attendance-logs`

## Security Features

- **JWT Authentication** - Secure token-based auth
- **Face Embedding Security** - Never expose raw embeddings
- **Network Verification** - Multi-layer network checks
- **Liveness Detection** - Prevents photo spoofing
- **Rate Limiting** - Prevents abuse (implement with middleware)
- **HTTPS Only** - Encrypted communication
- **Role-based Access** - Different permissions levels

## Error Codes

- `200` - Success, attendance recorded
- `400` - Bad request, validation failed
- `401` - Unauthorized, invalid credentials
- `403` - Forbidden, verification failed (face/liveness/network)
- `429` - Too many requests
- `500` - Server error

## Performance Optimization

- **Model Caching** - Keep DeepFace models loaded
- **Embedding Indexing** - pgvector ANN search
- **Connection Pooling** - Supabase connection management
- **Async Processing** - FastAPI async endpoints
- **Docker Optimization** - Multi-stage builds

## Monitoring

Check `/health` endpoint for system status:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "face_recognition": "loaded",
    "liveness_detection": "active"
  }
}
```

## Next Steps

1. **Frontend Integration** - Connect Next.js PWA
2. **Advanced Liveness** - More sophisticated spoof detection
3. **Push Notifications** - Real-time attendance alerts
4. **Analytics Dashboard** - Detailed reporting and insights
5. **Mobile App** - Native iOS/Android apps

## Support

For issues or questions:
1. Check logs in terminal
2. Verify Supabase connection
3. Test individual endpoints with `/docs`
4. Check network connectivity for hotspot testing

---
**Built for KL University** - Face recognition attendance prototype with real AI models 🎓📱