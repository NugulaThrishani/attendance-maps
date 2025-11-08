"""
Security utilities for password hashing and verification
"""

import hashlib
import secrets
from typing import Optional

def hash_password(password: str) -> str:
    """
    Hash a password using SHA-256 with salt
    Note: For production, use bcrypt or similar
    """
    # Generate a random salt
    salt = secrets.token_hex(32)
    
    # Create password hash with salt
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    
    # Return salt + hash (separated by $)
    return f"{salt}${password_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its hash
    """
    try:
        # Split salt and hash
        salt, stored_hash = hashed_password.split('$', 1)
        
        # Hash the provided password with the stored salt
        password_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
        
        # Compare hashes
        return password_hash == stored_hash
    except Exception:
        return False

def generate_password_hash(password: str) -> str:
    """
    Generate a password hash (alias for hash_password)
    """
    return hash_password(password)