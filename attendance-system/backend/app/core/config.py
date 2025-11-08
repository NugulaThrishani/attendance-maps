from pydantic_settings import BaseSettings
import os
from typing import List

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Supabase (optional for testing)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""  
    SUPABASE_SERVICE_KEY: str = ""
    
    # JWT
    JWT_SECRET_KEY: str = "your-testing-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Face Recognition
    FACE_RECOGNITION_THRESHOLD: float = 0.6
    LIVENESS_DETECTION_ENABLED: bool = True
    
    # Network Verification - Updated for localhost development + Dhanush's Android Hotspot
    ALLOWED_SSIDS: List[str] = ["Dhanush", "AttendanceDemo", "KLU_Attendance", "localhost", "testing", "*"] 
    ALLOWED_IP_RANGES: List[str] = ["192.168.43.0/24", "192.168.44.0/24", "10.0.0.0/24", "172.20.10.0/24", "127.0.0.0/8", "192.168.0.0/16"]
    
    # SSL Configuration for Development
    SSL_VERIFY: bool = False  # Set to True in production with proper certificates
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()