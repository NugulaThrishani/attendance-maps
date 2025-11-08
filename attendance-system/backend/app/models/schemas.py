from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# User Models
class UserRegistration(BaseModel):
    email: EmailStr
    faculty_id: str = Field(..., min_length=5, max_length=20)
    full_name: str = Field(..., min_length=2, max_length=100)
    department: Optional[str] = Field(None, max_length=50)
    designation: Optional[str] = Field(None, max_length=50)  # Professor, Associate Professor, etc.
    password: str = Field(..., min_length=8, max_length=100)
    face_images: List[str] = Field(..., min_items=3, max_items=10)  # Base64 encoded images
    
    @validator('faculty_id')
    def validate_faculty_id(cls, v):
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Faculty ID must contain only alphanumeric characters, hyphens, and underscores')
        return v.upper()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @validator('face_images')
    def validate_face_images(cls, v):
        for img in v:
            if not img.startswith(('data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/jpg;base64,')):
                raise ValueError('Face images must be valid base64 encoded JPEG/PNG images')
        return v

class UserResponse(BaseModel):
    id: str
    email: str
    faculty_id: str
    full_name: str
    department: Optional[str]
    designation: Optional[str]
    is_active: bool
    created_at: datetime
    embeddings_count: int = 0

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Attendance Models
class AttendanceRequest(BaseModel):
    live_image: str = Field(..., description="Base64 encoded live image for verification")
    liveness_sequence: Optional[List[str]] = Field(default=[], description="Sequence of images for liveness detection")
    network_info: Dict[str, Any] = Field(..., description="Network information (SSID, BSSID, etc.)")
    device_info: Optional[Dict[str, Any]] = Field(default={}, description="Device information")
    gps_coordinates: Optional[Dict[str, float]] = Field(default=None, description="GPS coordinates if available")
    
    @validator('live_image')
    def validate_live_image(cls, v):
        if not v.startswith(('data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/jpg;base64,')):
            raise ValueError('Live image must be valid base64 encoded JPEG/PNG image')
        return v

class AttendanceResponse(BaseModel):
    success: bool
    message: str
    attendance_id: Optional[str] = None
    timestamp: datetime
    verification_details: Dict[str, Any]
    network_verification: Dict[str, Any]
    liveness_verification: Optional[Dict[str, Any]] = None

class AttendanceRecord(BaseModel):
    id: str
    user_id: str
    faculty_id: str
    full_name: str
    timestamp: datetime
    location_verified: bool
    network_ssid: Optional[str]
    confidence_score: float
    liveness_passed: bool

# Network Models
class NetworkInfo(BaseModel):
    ssid: Optional[str] = None
    bssid: Optional[str] = None
    connection_type: str = "wifi"
    signal_strength: Optional[int] = None
    
class NetworkVerificationResponse(BaseModel):
    network_verified: bool
    ssid_verified: bool
    ip_verified: bool
    client_ip: str
    security_score: float
    details: Dict[str, Any]

# Face Recognition Models
class FaceEmbeddingRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image")
    
    @validator('image')
    def validate_image(cls, v):
        if not v.startswith(('data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/jpg;base64,')):
            raise ValueError('Image must be valid base64 encoded JPEG/PNG image')
        return v

class FaceEmbeddingResponse(BaseModel):
    embedding: Optional[List[float]] = None
    success: bool
    message: str

class FaceVerificationRequest(BaseModel):
    live_image: str
    liveness_sequence: Optional[List[str]] = Field(default=[])

class FaceVerificationResponse(BaseModel):
    match: bool
    confidence: float
    threshold: float
    liveness_passed: Optional[bool] = None
    user_id: Optional[str] = None
    message: str

# Admin Models
class AttendanceStatsResponse(BaseModel):
    total_users: int
    total_attendance_today: int
    total_attendance_this_week: int
    total_attendance_this_month: int
    verification_success_rate: float
    average_confidence_score: float
    network_verification_rate: float

class AttendanceLogQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    faculty_id: Optional[str] = None
    department: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)

class AttendanceLogResponse(BaseModel):
    records: List[AttendanceRecord]
    total_count: int
    page: int
    total_pages: int

# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    faculty_id: Optional[str] = None

# Error Models
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

# System Models
class HealthCheck(BaseModel):
    status: str
    timestamp: datetime
    services: Dict[str, str]
    version: str = "1.0.0"

class NetworkRequirements(BaseModel):
    allowed_ssids: List[str]
    allowed_ip_ranges: List[str]
    verification_methods: List[str]
    requirements: Dict[str, str]