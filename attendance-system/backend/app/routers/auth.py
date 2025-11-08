from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from typing import Optional
import logging

from app.models.schemas import (
    UserRegistration, UserResponse, UserLogin, Token, TokenData, 
    FaceEmbeddingResponse, ErrorResponse
)
from app.services.face_recognition import face_recognition_service
from app.core.security import hash_password, verify_password
from app.core.database import get_db, get_admin_db
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Convert datetime to timestamp for JWT exp claim
    exp_timestamp = int(expire.timestamp())
    to_encode.update({"exp": exp_timestamp})
    
    print(f"🔍 DEBUG: Current UTC time: {datetime.now(timezone.utc)}")
    print(f"🔍 DEBUG: Creating JWT token with data: {to_encode}")
    print(f"🔍 DEBUG: Token expires at: {expire} (timestamp: {exp_timestamp})")
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    print(f"🔍 DEBUG: Generated JWT token: {encoded_jwt[:50]}...")
    
    # Test decode immediately to verify
    try:
        test_decode = jwt.decode(encoded_jwt, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        print(f"🔍 DEBUG: Token validation test - SUCCESS: {test_decode}")
    except JWTError as e:
        print(f"❌ DEBUG: Token validation test - FAILED: {e}")
    
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    token = credentials.credentials
    
    print(f"🔍 DEBUG: Received token: {token[:50]}..." if len(token) > 50 else f"🔍 DEBUG: Received token: {token}")
    
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        print(f"🔍 DEBUG: Attempting to decode JWT token...")
        print(f"🔍 DEBUG: Current UTC time: {datetime.now(timezone.utc)}")
        print(f"🔍 DEBUG: JWT_SECRET_KEY: {settings.JWT_SECRET_KEY[:10]}...")
        print(f"🔍 DEBUG: JWT_ALGORITHM: {settings.JWT_ALGORITHM}")
        
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        print(f"🔍 DEBUG: JWT decoded successfully: {payload}")
        
        # Check expiration manually for debugging
        exp_timestamp = payload.get("exp")
        if exp_timestamp:
            exp_time = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
            current_time = datetime.now(timezone.utc)
            print(f"🔍 DEBUG: Token expires at: {exp_time}")
            print(f"🔍 DEBUG: Current time: {current_time}")
            print(f"🔍 DEBUG: Token is {'VALID' if exp_time > current_time else 'EXPIRED'}")
        
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        faculty_id: str = payload.get("faculty_id")
        
        print(f"🔍 DEBUG: Extracted from token - user_id: {user_id}, email: {email}, faculty_id: {faculty_id}")
        
        if user_id is None or email is None:
            print(f"❌ DEBUG: Missing user_id or email in token")
            raise credentials_exception
            
        token_data = TokenData(user_id=user_id, email=email, faculty_id=faculty_id)
        
    except JWTError as e:
        print(f"❌ DEBUG: JWT decode error: {str(e)}")
        raise credentials_exception
    except Exception as e:
        print(f"❌ DEBUG: Unexpected error during JWT decode: {str(e)}")
        raise credentials_exception
    
    # Verify user exists in database
    db = get_admin_db()
    try:
        print(f"🔍 DEBUG: Looking up user in database with ID: {token_data.user_id}")
        result = db.table("users").select("*").eq("id", token_data.user_id).eq("is_active", True).execute()
        print(f"🔍 DEBUG: Database query result: {len(result.data) if result.data else 0} users found")
        
        if not result.data:
            print(f"❌ DEBUG: No active user found with ID: {token_data.user_id}")
            raise credentials_exception
        
        user_data = result.data[0]
        print(f"🔍 DEBUG: Found user: {user_data.get('email')} - {user_data.get('faculty_id')}")
        
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            faculty_id=user_data["faculty_id"],
            full_name=user_data["full_name"],
            department=user_data.get("department"),
            designation=user_data.get("designation"),
            is_active=user_data["is_active"],
            created_at=user_data["created_at"]
        )
        
    except Exception as e:
        print(f"❌ DEBUG: Database error during user lookup: {str(e)}")
        logger.error(f"Error fetching user: {str(e)}")
        raise credentials_exception

@router.post("/register", response_model=Token)
async def register_user(user_data: UserRegistration, request: Request):
    """
    Register new user with face images
    Extracts face embeddings and stores them in database
    """
    try:
        db_admin = get_admin_db()
        
        # Check if user already exists
        existing_user = db_admin.table("users").select("id").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        existing_faculty = db_admin.table("users").select("id").eq("faculty_id", user_data.faculty_id).execute()
        if existing_faculty.data:
            raise HTTPException(status_code=400, detail="User with this faculty ID already exists")
        
        # Extract face embeddings from images
        face_embeddings = []
        successful_extractions = 0
        
        for i, image_data in enumerate(user_data.face_images):
            try:
                embedding = face_recognition_service.extract_embedding(image_data)
                if embedding:
                    face_embeddings.append(embedding)
                    successful_extractions += 1
                else:
                    logger.warning(f"Failed to extract embedding from image {i+1}")
            except Exception as e:
                logger.error(f"Error processing image {i+1}: {str(e)}")
        
        # Require at least 2 successful embeddings
        if successful_extractions < 2:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to extract face embeddings. Only {successful_extractions} out of {len(user_data.face_images)} images were processed successfully. Please provide clearer face images."
            )
        
        # Create user in database
        user_insert = db_admin.table("users").insert({
            "email": user_data.email,
            "faculty_id": user_data.faculty_id,
            "full_name": user_data.full_name,
            "department": user_data.department,
            "designation": user_data.designation,
            "password_hash": hash_password(user_data.password),
            "is_active": True
        }).execute()
        
        if not user_insert.data:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        user = user_insert.data[0]
        user_id = user["id"]
        
        # Store face embeddings
        embeddings_stored = 0
        for embedding in face_embeddings:
            try:
                embedding_insert = db_admin.table("face_embeddings").insert({
                    "user_id": user_id,
                    "embedding": embedding
                }).execute()
                
                if embedding_insert.data:
                    embeddings_stored += 1
                    
            except Exception as e:
                logger.error(f"Error storing embedding: {str(e)}")
        
        if embeddings_stored == 0:
            # Rollback user creation if no embeddings were stored
            db_admin.table("users").delete().eq("id", user_id).execute()
            raise HTTPException(status_code=500, detail="Failed to store face embeddings")
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "user_id": user_id,
            "email": user["email"],
            "faculty_id": user["faculty_id"]
        }
        access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
        
        # Return response with token and user info
        user_response = UserResponse(
            id=user["id"],
            email=user["email"],
            faculty_id=user["faculty_id"],
            full_name=user["full_name"],
            department=user.get("department"),
            designation=user.get("designation"),
            is_active=user["is_active"],
            created_at=user["created_at"],
            embeddings_count=embeddings_stored
        )
        
        logger.info(f"User registered successfully: {user['faculty_id']} with {embeddings_stored} embeddings")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=Token)  
async def login_user(login_data: UserLogin):
    """
    Login user with email and password
    Returns JWT token for authenticated sessions
    """
    try:
        # Use admin db for testing (same as setup function)
        db = get_admin_db()
        
        # Find user by email
        result = db.table("users").select("*").eq("email", login_data.email).eq("is_active", True).execute()
        
        if not result.data:
            raise HTTPException(status_code=401, detail=f"User not found with email: {login_data.email}")
        
        user = result.data[0]
        
        # Verify password
        if not verify_password(login_data.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        logger.info(f"Login attempt for user: {user['email']} with faculty_id: {user['faculty_id']}")
        
        # Get embedding count
        embeddings = db.table("face_embeddings").select("id").eq("user_id", user["id"]).execute()
        embeddings_count = len(embeddings.data) if embeddings.data else 0
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "user_id": user["id"],
            "email": user["email"],
            "faculty_id": user["faculty_id"]
        }
        access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
        
        user_response = UserResponse(
            id=user["id"],
            email=user["email"],
            faculty_id=user["faculty_id"],
            full_name=user["full_name"],
            department=user.get("department"),
            designation=user.get("designation"),
            is_active=user["is_active"],
            created_at=user["created_at"],
            embeddings_count=embeddings_count
        )
        
        logger.info(f"User logged in successfully: {user['faculty_id']}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.post("/test-login", response_model=Token)
async def test_login_user(login_data: UserLogin):
    """
    Test login endpoint that bypasses password verification for testing
    """
    try:
        db = get_admin_db()
        
        # Find user by email only (for testing)
        result = db.table("users").select("*").eq("email", login_data.email).eq("is_active", True).execute()
        
        if not result.data:
            raise HTTPException(status_code=401, detail=f"User not found: {login_data.email}")
        
        user = result.data[0]
        
        # Create access token without password verification
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "user_id": user["id"],
            "email": user["email"],
            "faculty_id": user["faculty_id"]
        }
        access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
        
        user_response = UserResponse(
            id=user["id"],
            email=user["email"],
            faculty_id=user["faculty_id"],
            full_name=user["full_name"],
            department=user.get("department"),
            designation=user.get("designation"),
            is_active=user["is_active"],
            created_at=user["created_at"],
            embeddings_count=0
        )
        
        logger.info(f"Test login successful: {user['faculty_id']}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during test login: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test login failed: {str(e)}")

@router.post("/fix-user-password")
async def fix_user_password(email: str, new_password: str):
    """
    Debug endpoint to fix password for existing user
    """
    try:
        db_admin = get_admin_db()
        
        # Hash the new password
        password_hash = hash_password(new_password)
        
        # Update user password
        result = db_admin.table("users").update({
            "password_hash": password_hash
        }).eq("email", email).execute()
        
        if result.data:
            return {"message": f"Password updated for {email}"}
        else:
            return {"error": f"User not found: {email}"}
            
    except Exception as e:
        return {"error": f"Failed to update password: {str(e)}"}

@router.get("/debug/users")
async def debug_list_users():
    """
    Debug endpoint to list all users in database
    """
    try:
        db = get_admin_db()
        result = db.table("users").select("id, email, faculty_id, full_name, is_active").execute()
        
        if result.data:
            return {
                "users_found": len(result.data),
                "users": result.data
            }
        else:
            return {"users_found": 0, "users": []}
            
    except Exception as e:
        return {"error": f"Failed to list users: {str(e)}"}

@router.post("/debug/create-test-user")
async def debug_create_test_user():
    """
    Debug endpoint to create a test user directly
    """
    try:
        db_admin = get_admin_db()
        
        # Insert test user
        user_data = {
            "email": "avulavenkatadhanush@gmail.com",
            "faculty_id": "KLU_FAC_001",
            "full_name": "Dhanush Avula",
            "department": "Computer Science",
            "designation": "Professor",
            "password_hash": hash_password("SecurePassword123!"),
            "is_active": True
        }
        
        result = db_admin.table("users").insert(user_data).execute()
        
        if result.data:
            return {"message": "Test user created successfully", "user": result.data[0]}
        else:
            return {"error": "Failed to create test user"}
            
    except Exception as e:
        return {"error": f"Failed to create test user: {str(e)}"}

@router.post("/setup-dhanush-user")
async def setup_dhanush_user():
    """
    Setup Dhanush's user account with proper configuration
    """
    try:
        db_admin = get_admin_db()
        
        # Check if user already exists
        existing_user = db_admin.table("users").select("*").eq("email", "avulavenkatadhanush@gmail.com").execute()
        
        if existing_user.data:
            # Update existing user
            user_id = existing_user.data[0]["id"]
            updated_user = db_admin.table("users").update({
                "password_hash": hash_password("2300040343"),
                "full_name": "Dhanush",
                "department": "Computer Science",
                "designation": "Student",
                "is_active": True
            }).eq("id", user_id).execute()
            
            message = "Existing user updated successfully"
            user_data = updated_user.data[0] if updated_user.data else existing_user.data[0]
        else:
            # Create new user
            user_data = {
                "email": "avulavenkatadhanush@gmail.com",
                "faculty_id": "KLU_FAC_DHANUSH",
                "full_name": "Dhanush",
                "department": "Computer Science",
                "designation": "Student",
                "password_hash": hash_password("2300040343"),
                "is_active": True
            }
            
            result = db_admin.table("users").insert(user_data).execute()
            message = "New user created successfully"
            user_data = result.data[0]
            user_id = user_data["id"]
        
        # Create dummy face embeddings for testing
        embeddings_count = 0
        for i in range(3):
            try:
                import random
                dummy_embedding = [random.uniform(-1, 1) for _ in range(512)]
                
                embedding_insert = db_admin.table("face_embeddings").insert({
                    "user_id": user_id,
                    "embedding": dummy_embedding
                }).execute()
                
                if embedding_insert.data:
                    embeddings_count += 1
            except Exception as e:
                logger.warning(f"Failed to create embedding {i+1}: {str(e)}")
        
        # Also setup network configuration
        try:
            db_admin.table("network_config").insert({
                "ssid": "Dhanush",
                "ip_range": "192.168.43.0/24",
                "is_active": True
            }).execute()
        except Exception as e:
            logger.info(f"Network config may already exist: {str(e)}")
        
        return {
            "message": message,
            "user": {
                "id": user_data["id"],
                "email": user_data["email"],
                "faculty_id": user_data["faculty_id"],
                "full_name": user_data["full_name"],
                "department": user_data["department"],
                "designation": user_data["designation"]
            },
            "embeddings_created": embeddings_count,
            "network_configured": "Dhanush hotspot added",
            "login_credentials": {
                "email": "avulavenkatadhanush@gmail.com",
                "password": "2300040343"
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to setup Dhanush user: {str(e)}")
        return {"error": f"Setup failed: {str(e)}"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.get("/verify-token")
async def verify_token(current_user: UserResponse = Depends(get_current_user)):
    """Verify if current token is valid"""
    return {
        "valid": True,
        "user_id": current_user.id,
        "faculty_id": current_user.faculty_id,
        "message": "Token is valid"
    }