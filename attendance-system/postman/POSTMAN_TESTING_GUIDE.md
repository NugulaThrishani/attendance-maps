# 🚀 POSTMAN API TESTING GUIDE - DHANUSH'S ATTENDANCE SYSTEM

## 📥 **SETUP INSTRUCTIONS**

### **1. Import Collection & Environment**
```
1. Open Postman
2. Click "Import" button
3. Import these files:
   - Dhanush_Attendance_System.postman_collection.json
   - Dhanush_Environment.postman_environment.json
4. Select "Dhanush Attendance System Environment" in top-right dropdown
```

### **2. Start Your Server**
```bash
cd d:\chance\attendance-system\backend
python main.py
```
Server should be running on: **http://localhost:8000**

---

## 🧪 **TESTING SEQUENCE**

### **STEP 1: Health Check** ✅
```
GET /health
```
**Expected**: `200 OK` with server status
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

### **STEP 2: Setup Your Account** 👤
```
POST /auth/setup-dhanush-user
```
**Expected**: `200 OK` - Creates/updates your account
```json
{
    "message": "Existing user updated successfully",
    "user": {
        "email": "avulavenkatadhanush@gmail.com",
        "faculty_id": "KLU_FAC_002",
        "full_name": "Dhanush"
    },
    "login_credentials": {
        "email": "avulavenkatadhanush@gmail.com",
        "password": "2300040343"
    }
}
```

### **STEP 3: Login** 🔐
```
POST /auth/login
Body: {
    "email": "avulavenkatadhanush@gmail.com",
    "password": "2300040343"
}
```
**Expected**: `200 OK` with JWT token
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "token_type": "bearer",
    "user": { ... }
}
```
**Note**: Token automatically saved to environment variable

### **STEP 4: Test Attendance Marking** 📝
```
POST /attendance/mark
Headers: Authorization: Bearer {{auth_token}}
Body: {
    "face_images": ["base64_image_data"],
    "network_info": {
        "ssid": "Dhanush",
        "ip_address": "192.168.43.100"
    }
}
```

### **STEP 5: View Debug Info** 🔍
```
GET /auth/debug/users
```
**Expected**: List of all users in system

---

## 📊 **COMPLETE TEST SCENARIOS**

### **🟢 POSITIVE TESTS**

#### **1. Authentication Flow**
- ✅ Setup Dhanush user
- ✅ Login with correct credentials  
- ✅ Access protected endpoints with token

#### **2. Network Verification**
- ✅ Attendance with "Dhanush" SSID
- ✅ Valid IP range (192.168.43.x)

#### **3. Face Recognition**
- ✅ Registration with face images
- ✅ Attendance marking with face verification

### **🔴 NEGATIVE TESTS**

#### **1. Authentication Failures**
- ❌ Login with wrong password
- ❌ Access protected endpoint without token
- ❌ Access with expired token

#### **2. Network Failures**
- ❌ Attendance from unauthorized network
- ❌ Wrong SSID
- ❌ Invalid IP range

#### **3. Data Validation**
- ❌ Registration without required fields
- ❌ Invalid email format
- ❌ Missing face images

---

## 🔧 **POSTMAN COLLECTION FEATURES**

### **Auto-Token Management**
- Login automatically saves JWT token
- All protected endpoints use saved token
- Environment variables for easy configuration

### **Test Scripts**
```javascript
// Login Test Script
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set('auth_token', jsonData.access_token);
    pm.environment.set('user_id', jsonData.user.id);
}
```

### **Pre-configured Variables**
```
{{base_url}}          = http://localhost:8000
{{auth_token}}         = Auto-filled from login
{{user_id}}           = Auto-filled from login
{{dhanush_email}}     = avulavenkatadhanush@gmail.com
{{dhanush_password}}  = 2300040343
{{dhanush_hotspot}}   = Dhanush
```

---

## 📱 **TESTING YOUR ANDROID HOTSPOT**

### **Real Network Test**
1. **Enable your Android hotspot "Dhanush"**
2. **Connect your computer to the hotspot**
3. **Check your IP**: `ipconfig` (should be 192.168.43.x)
4. **Run attendance marking test**

### **Network Validation**
```
Valid SSID: "Dhanush"
Valid IP ranges:
- 192.168.43.0/24 (Android hotspot)
- 192.168.44.0/24 (Alternative)
- 172.20.10.0/24 (iOS backup)
```

---

## 🎯 **KEY ENDPOINTS SUMMARY**

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/health` | Server health | ❌ |
| POST | `/auth/setup-dhanush-user` | Setup your account | ❌ |
| POST | `/auth/login` | Login & get token | ❌ |
| GET | `/auth/me` | Current user info | ✅ |
| POST | `/attendance/mark` | Mark attendance | ✅ |
| GET | `/attendance/history` | View attendance | ✅ |
| GET | `/admin/dashboard-stats` | Admin statistics | ✅ |
| GET | `/auth/debug/users` | Debug user list | ❌ |

---

## 🚨 **COMMON ISSUES & SOLUTIONS**

### **401 Unauthorized**
- ✅ Run login first to get token
- ✅ Check token is saved in environment
- ✅ Ensure server is running

### **Network Verification Failed**
- ✅ Connect to "Dhanush" hotspot
- ✅ Check SSID spelling exactly
- ✅ Verify IP range (192.168.43.x)

### **Face Recognition Issues**
- ✅ System is in testing mode (should work with dummy data)
- ✅ Check server logs for errors
- ✅ Ensure DeepFace libraries loaded

---

## 🎉 **SUCCESS CRITERIA**

**Your system is working if:**
- ✅ Health check returns 200
- ✅ Login returns JWT token
- ✅ Attendance marking with "Dhanush" network succeeds
- ✅ Debug endpoints show your user account
- ✅ Admin dashboard returns statistics

**🎓 Your KL University Attendance System is fully functional!**

---

*Testing Guide for Dhanush's Attendance System*  
*Generated: September 16, 2025*