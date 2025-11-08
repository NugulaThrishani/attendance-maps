from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import Response
import uvicorn
from dotenv import load_dotenv
import os
import logging

from app.routers import auth, attendance, admin
from app.core.config import settings
from app.core.database import init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(
    title="KL University Attendance System",
    description="Face Recognition Based Attendance System with Wi-Fi Verification",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js frontend
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://localhost:3001",  # Backup port
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
)

# Add custom middleware to log CORS requests
@app.middleware("http")
async def log_cors_middleware(request: Request, call_next):
    logger.info(f"🌐 {request.method} {request.url}")
    logger.info(f"🌐 Origin: {request.headers.get('Origin', 'None')}")
    logger.info(f"🌐 Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    logger.info(f"🌐 Response status: {response.status_code}")
    logger.info(f"🌐 Response headers: {dict(response.headers)}")
    
    return response

app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # In production, specify exact hosts
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(admin.router, prefix="/admin", tags=["Administration"])

@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    await init_db()
    print(f"🚀 FastAPI server starting on {settings.HOST}:{settings.PORT}")
    print(f"📖 Documentation available at: http://{settings.HOST}:{settings.PORT}/docs")

@app.get("/")
async def root():
    return {
        "message": "KL University Attendance System API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "database": "connected",
            "face_recognition": "loaded",
            "liveness_detection": "active"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )