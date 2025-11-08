from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime
from typing import List, Dict, Any
import logging
import json

from app.models.schemas import (
    AttendanceRequest, AttendanceResponse, AttendanceRecord,
    NetworkVerificationResponse, UserResponse
)
from app.services.face_recognition import face_recognition_service
from app.services.network_verification import network_verification_service
from app.routers.auth import get_current_user
from app.core.database import get_admin_db

logger = logging.getLogger(__name__)
router = APIRouter()

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    # Check for forwarded IP first (if behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct client IP
    client_host = request.client.host if request.client else "unknown"
    return client_host

@router.post("/verify", response_model=AttendanceResponse)
async def mark_attendance(
    attendance_data: AttendanceRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Mark attendance with face verification, liveness detection, and network verification
    This is the main attendance endpoint with all security checks
    """
    try:
        logger.info(f"🔍 Attendance verification started for user: {current_user.faculty_id}")
        logger.info(f"🔍 Request data - has live_image: {bool(attendance_data.live_image)}")
        logger.info(f"🔍 Request data - live_image length: {len(attendance_data.live_image) if attendance_data.live_image else 0}")
        logger.info(f"🔍 Request data - liveness_sequence length: {len(attendance_data.liveness_sequence) if attendance_data.liveness_sequence else 0}")
        
        db_admin = get_admin_db()
        client_ip = get_client_ip(request)
        
        logger.info(f"🔍 Client IP: {client_ip}")
        
        verification_details = {
            "face_verification": {},
            "liveness_verification": {},
            "network_verification": {},
            "timestamp": datetime.utcnow().isoformat(),
            "client_ip": client_ip
        }
        
        # Step 1: Network Verification
        logger.info("🔍 Step 1: Starting network verification...")
        try:
            network_result = network_verification_service.verify_network_access(
                attendance_data.network_info, 
                client_ip
            )
            verification_details["network_verification"] = network_result
            logger.info(f"🔍 Network verification result: {network_result}")
        except Exception as e:
            logger.error(f"❌ Network verification error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Network verification failed: {str(e)}")
        
        if not network_result["network_verified"]:
            logger.warning(f"❌ Network verification failed for user {current_user.faculty_id}: {network_result}")
            return AttendanceResponse(
                success=False,
                message="Network verification failed. Please ensure you are connected to the correct Wi-Fi network.",
                timestamp=datetime.utcnow(),
                verification_details=verification_details,
                network_verification=network_result
            )
        
        # Step 2: Liveness Detection (if enabled and sequence provided)
        logger.info("🔍 Step 2: Starting liveness detection...")
        liveness_passed = True
        liveness_result = {"liveness_passed": True, "reason": "No liveness sequence provided"}
        
        try:
            if attendance_data.liveness_sequence and len(attendance_data.liveness_sequence) > 0:
                logger.info(f"🔍 Liveness check with {len(attendance_data.liveness_sequence)} images")
                liveness_result = face_recognition_service.detect_liveness(attendance_data.liveness_sequence)
                
                # Convert any numpy types to Python native types
                liveness_result = {k: (bool(v) if hasattr(v, 'item') else float(v) if isinstance(v, (float, int)) and hasattr(v, 'item') else v) 
                                 for k, v in liveness_result.items()}
                
                liveness_passed = bool(liveness_result.get("liveness_passed", False))
                verification_details["liveness_verification"] = liveness_result
                logger.info(f"🔍 Liveness result: {liveness_passed}")
                
                if not liveness_passed:
                    logger.warning(f"❌ Liveness detection failed for user {current_user.faculty_id}")
                    return AttendanceResponse(
                        success=False,
                        message="Liveness detection failed. Please ensure you are physically present and follow the liveness prompts.",
                        timestamp=datetime.utcnow(),
                        verification_details=verification_details,
                        network_verification=network_result,
                        liveness_verification=liveness_result
                    )
        except Exception as e:
            logger.error(f"❌ Liveness detection error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Liveness detection failed: {str(e)}")
        
        # Step 3: Get stored face embeddings for current user
        logger.info("🔍 Step 3: Getting stored face embeddings...")
        try:
            logger.info(f"🔍 Querying embeddings for user_id: {current_user.id}")
            embeddings_result = db_admin.table("face_embeddings").select("embedding").eq("user_id", current_user.id).execute()
            logger.info(f"🔍 Database query completed. Found {len(embeddings_result.data) if embeddings_result.data else 0} stored embeddings")
            
            if not embeddings_result.data:
                logger.error(f"❌ No face embeddings found for user {current_user.id}")
                return AttendanceResponse(
                    success=False,
                    message="No face data found for your account. Please complete face registration first by visiting the registration page.",
                    timestamp=datetime.utcnow(),
                    verification_details=verification_details,
                    network_verification=network_result,
                    liveness_verification=liveness_result if attendance_data.liveness_sequence else None
                )
            
            # Validate and extract embeddings
            stored_embeddings = []
            for i, record in enumerate(embeddings_result.data):
                try:
                    embedding = record.get("embedding")
                    
                    # Handle both string and list formats
                    if isinstance(embedding, str):
                        try:
                            # Try to parse JSON string
                            import json
                            embedding = json.loads(embedding)
                            logger.info(f"✅ Parsed embedding {i+1} from JSON string (dimension: {len(embedding)})")
                        except json.JSONDecodeError:
                            logger.warning(f"⚠️ Invalid JSON embedding {i+1}: cannot parse string")
                            continue
                    
                    if embedding and isinstance(embedding, list) and len(embedding) > 0:
                        # Convert to standard Python list (in case it's numpy array)
                        embedding = [float(x) for x in embedding]
                        stored_embeddings.append(embedding)
                        logger.info(f"✅ Valid embedding {i+1} loaded (dimension: {len(embedding)})")
                    else:
                        logger.warning(f"⚠️ Invalid embedding {i+1}: {type(embedding)} with length {len(embedding) if hasattr(embedding, '__len__') else 'N/A'}")
                        
                except Exception as embed_error:
                    logger.error(f"❌ Error processing embedding {i+1}: {str(embed_error)}")
                    continue
            if not stored_embeddings:
                logger.error(f"❌ No valid embeddings found for user {current_user.id}")
                return AttendanceResponse(
                    success=False,
                    message="Your face data appears to be corrupted. Please re-register your face data by visiting the registration page.",
                    timestamp=datetime.utcnow(),
                    verification_details=verification_details,
                    network_verification=network_result,
                    liveness_verification=liveness_result if attendance_data.liveness_sequence else None
                )
            
            logger.info(f"🔍 Loaded {len(stored_embeddings)} valid face embeddings for comparison")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Database error getting embeddings: {str(e)}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            return AttendanceResponse(
                success=False,
                message="Database error occurred while retrieving your face data. Please try again later.",
                timestamp=datetime.utcnow(),
                verification_details=verification_details,
                network_verification=network_result,
                liveness_verification=liveness_result if attendance_data.liveness_sequence else None
            )
        
        # Step 4: Face Verification
        logger.info("🔍 Step 4: Starting face verification...")
        try:
            face_result = face_recognition_service.verify_faces(
                attendance_data.live_image,
                stored_embeddings
            )
            
            # Convert any numpy types to Python native types (including nested structures)
            def convert_numpy_types(obj):
                """Recursively convert numpy types to native Python types"""
                import numpy as np
                if hasattr(obj, 'item'):  # numpy scalars
                    return obj.item()
                elif isinstance(obj, np.ndarray):
                    return obj.tolist()
                elif isinstance(obj, dict):
                    return {k: convert_numpy_types(v) for k, v in obj.items()}
                elif isinstance(obj, (list, tuple)):
                    return type(obj)(convert_numpy_types(v) for v in obj)
                else:
                    return obj
            
            face_result = convert_numpy_types(face_result)
            
            verification_details["face_verification"] = face_result
            verification_details = convert_numpy_types(verification_details)  # Convert entire verification details
            logger.info(f"🔍 Face verification result: {face_result}")
            
        except Exception as e:
            logger.error(f"❌ Face verification error: {str(e)}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            
            # Return graceful error instead of 500
            return AttendanceResponse(
                success=False,
                message="Face verification service is temporarily unavailable. Please try again later.",
                timestamp=datetime.utcnow(),
                verification_details=verification_details,
                network_verification=network_result,
                liveness_verification=liveness_result if attendance_data.liveness_sequence else None
            )
        
        # Step 4.5: ADVANCED SECURITY CHECKS
        if face_result.get("match", False):
            logger.info("🔒 Performing advanced security validation...")
            
            try:
                # Get recent authentication attempts for temporal analysis
                recent_attempts_query = db_admin.table("attendance").select("*").eq("user_id", current_user.id).order("timestamp", desc=True).limit(20).execute()
                recent_attempts = recent_attempts_query.data if recent_attempts_query.data else []
                
                # Temporal security analysis
                temporal_analysis = face_recognition_service.analyze_temporal_security_patterns(
                    current_user.faculty_id,
                    recent_attempts,
                    face_result.get('confidence', 0)
                )
                
                verification_details["temporal_security"] = temporal_analysis
                
                # Check if temporal analysis suggests blocking
                if temporal_analysis.get("should_block", False):
                    logger.error(f"🚨 TEMPORAL SECURITY BLOCK: User {current_user.faculty_id} blocked due to suspicious patterns")
                    return AttendanceResponse(
                        success=False,
                        message="Authentication temporarily blocked due to suspicious activity patterns. Please contact administrator.",
                        timestamp=datetime.utcnow(),
                        verification_details=verification_details,
                        network_verification=network_result,
                        liveness_verification=liveness_result if attendance_data.liveness_sequence else None
                    )
                
                # Additional verification required
                if temporal_analysis.get("should_require_additional_verification", False):
                    logger.warning(f"⚠️ ADDITIONAL VERIFICATION REQUIRED: User {current_user.faculty_id} flagged for enhanced security")
                    
                    # For now, we'll proceed but log the requirement for future implementation
                    verification_details["additional_verification_recommended"] = True
                
                logger.info(f"✅ Advanced security checks completed - Risk level: {temporal_analysis.get('risk_level', 'UNKNOWN')}")
                
            except Exception as security_error:
                logger.error(f"❌ Advanced security check error: {str(security_error)}")
                # Don't block user for security check failures, but log them
                verification_details["security_check_error"] = str(security_error)
        
        if not face_result.get("match", False):
            logger.warning(f"Face verification failed for user {current_user.faculty_id}: confidence={face_result.get('confidence', 0)}")
            
            # SECURITY: Log potential security issues and provide helpful feedback
            confidence = face_result.get('confidence', 0)
            raw_similarity = face_result.get('raw_similarity', 0)
            threshold = face_result.get('threshold', 0.65)
            
            # Generate helpful message based on the failure reason
            if raw_similarity > 0.9:
                # High raw similarity but low confidence - likely lighting/quality issue
                failure_message = f"Face verification failed. Your face was recognized (similarity: {raw_similarity:.1%}) but image quality caused low confidence ({confidence:.1%}). Please try with better lighting, clearer angle, or move closer to camera."
            elif raw_similarity > 0.7:
                # Moderate similarity - might be legitimate user with poor conditions
                failure_message = f"Face verification failed. Moderate face match detected ({raw_similarity:.1%} similarity, {confidence:.1%} confidence vs {threshold:.1%} required). Please ensure good lighting and clear face visibility."
            elif confidence > 0.25 and confidence < 0.5:
                logger.warning(f"🚨 SECURITY ALERT: Medium confidence match rejected for user {current_user.faculty_id} - Potential unauthorized access attempt")
                failure_message = f"Face verification failed. Confidence too low ({confidence:.1%} vs {threshold:.1%} required). Please ensure you are the registered user and try with better lighting."
            else:
                # Low similarity - likely not the registered user
                failure_message = f"Face verification failed. Low face match confidence ({confidence:.1%} vs {threshold:.1%} required). Please ensure you are the registered user or contact support for face re-registration."
            
            return AttendanceResponse(
                success=False,
                message=failure_message,
                timestamp=datetime.utcnow(),
                verification_details=verification_details,
                network_verification=network_result,
                liveness_verification=liveness_result
            )
        
        # Step 5: All verifications passed - Record attendance
        confidence = face_result.get('confidence', 0)
        avg_similarity = face_result.get('average_similarity', 0)
        
        # Log successful authentication with security metrics
        logger.info(f"✅ Successful face verification for user {current_user.faculty_id}: confidence={confidence:.3f}, avg_similarity={avg_similarity:.3f}")
        
        attendance_record = {
            "user_id": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
            "location_verified": bool(network_result["network_verified"]),
            "network_ssid": attendance_data.network_info.get("ssid"),
            "device_ip": client_ip,
            "confidence_score": float(confidence),
            "liveness_passed": bool(liveness_passed)
        }
        
        # Insert attendance record
        insert_result = db_admin.table("attendance").insert(attendance_record).execute()
        
        if not insert_result.data:
            raise HTTPException(status_code=500, detail="Failed to record attendance")
        
        attendance_id = insert_result.data[0]["id"]
        
        logger.info(f"Attendance recorded successfully for user {current_user.faculty_id} with ID {attendance_id}")
        
        return AttendanceResponse(
            success=True,
            message="Attendance marked successfully!",
            attendance_id=attendance_id,
            timestamp=datetime.utcnow(),
            verification_details=verification_details,
            network_verification=network_result,
            liveness_verification=liveness_result if attendance_data.liveness_sequence else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ CRITICAL ERROR during attendance verification: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        import traceback
        logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        
        # Return graceful error response instead of 500
        return AttendanceResponse(
            success=False,
            message="An unexpected error occurred during attendance verification. Please try again later or contact support if the problem persists.",
            timestamp=datetime.utcnow(),
            verification_details={"error": str(e)},
            network_verification={"network_verified": False, "error": "Verification interrupted"},
            liveness_verification=None
        )

@router.get("/my-records", response_model=List[AttendanceRecord])
async def get_my_attendance_records(
    limit: int = 50,
    offset: int = 0,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get attendance records for current user"""
    try:
        db_admin = get_admin_db()
        
        # Query attendance records for current user
        query = db_admin.table("attendance")\
            .select("*, users(faculty_id, full_name)")\
            .eq("user_id", current_user.id)\
            .order("timestamp", desc=True)\
            .limit(limit)\
            .offset(offset)
        
        result = query.execute()
        
        records = []
        for record in result.data:
            user_info = record.get("users", {})
            records.append(AttendanceRecord(
                id=record["id"],
                user_id=record["user_id"],
                faculty_id=user_info.get("faculty_id", current_user.faculty_id),
                full_name=user_info.get("full_name", current_user.full_name),
                timestamp=record["timestamp"],
                location_verified=record["location_verified"],
                network_ssid=record.get("network_ssid"),
                confidence_score=record["confidence_score"],
                liveness_passed=record["liveness_passed"]
            ))
        
        return records
        
    except Exception as e:
        logger.error(f"Error fetching attendance records: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch attendance records")

@router.get("/network-requirements")
async def get_network_requirements():
    """Get network requirements and allowed networks"""
    try:
        requirements = network_verification_service.get_network_requirements()
        return requirements
        
    except Exception as e:
        logger.error(f"Error fetching network requirements: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch network requirements")

@router.post("/verify-network", response_model=NetworkVerificationResponse)
async def verify_network_only(
    network_info: Dict[str, Any],
    request: Request,
    current_user: UserResponse = Depends(get_current_user)
):
    """Test network verification without marking attendance"""
    try:
        client_ip = get_client_ip(request)
        
        network_result = network_verification_service.verify_network_access(
            network_info, 
            client_ip
        )
        
        return NetworkVerificationResponse(
            network_verified=network_result["network_verified"],
            ssid_verified=network_result.get("ssid_verified", False),
            ip_verified=network_result.get("ip_verified", False),
            client_ip=client_ip,
            security_score=network_result.get("security_score", 0.0),
            details=network_result
        )
        
    except Exception as e:
        logger.error(f"Error in network verification test: {str(e)}")
        raise HTTPException(status_code=500, detail="Network verification test failed")

@router.get("/today-summary")
async def get_today_attendance_summary(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get today's attendance summary for current user"""
    try:
        db_admin = get_admin_db()
        
        today = datetime.utcnow().date()
        
        # Get today's attendance records
        result = db_admin.table("attendance")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .gte("timestamp", today.isoformat())\
            .order("timestamp", desc=True)\
            .execute()
        
        records = result.data or []
        
        summary = {
            "date": today.isoformat(),
            "total_records": len(records),
            "first_attendance": records[-1]["timestamp"] if records else None,
            "last_attendance": records[0]["timestamp"] if records else None,
            "network_verifications_passed": sum(1 for r in records if r["location_verified"]),
            "average_confidence": sum(r["confidence_score"] for r in records) / len(records) if records else 0,
            "liveness_checks_passed": sum(1 for r in records if r["liveness_passed"]),
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Error fetching today's summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch today's summary")

@router.post("/test-face-recognition")
async def test_face_recognition(
    test_data: AttendanceRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Test face recognition without marking attendance - for debugging purposes"""
    try:
        logger.info(f"🧪 Face recognition test for user: {current_user.faculty_id}")
        
        db_admin = get_admin_db()
        
        # Get stored face embeddings
        embeddings_result = db_admin.table("face_embeddings").select("embedding").eq("user_id", current_user.id).execute()
        
        if not embeddings_result.data:
            return {
                "success": False,
                "message": "No face embeddings found. Please register first.",
                "embeddings_count": 0
            }
        
        # Validate and extract embeddings  
        stored_embeddings = []
        for i, record in enumerate(embeddings_result.data):
            try:
                embedding = record.get("embedding")
                if isinstance(embedding, str):
                    try:
                        import json
                        embedding = json.loads(embedding)
                    except json.JSONDecodeError:
                        continue
                        
                if embedding and isinstance(embedding, list) and len(embedding) > 0:
                    embedding = [float(x) for x in embedding]
                    stored_embeddings.append(embedding)
            except Exception:
                continue
        
        if not stored_embeddings:
            return {
                "success": False,
                "message": "Face data appears corrupted. Please re-register.",
                "embeddings_count": len(embeddings_result.data),
                "valid_embeddings": 0
            }
        
        # Test face verification
        face_result = face_recognition_service.verify_faces(
            test_data.live_image,
            stored_embeddings
        )
        
        # Convert numpy types
        face_result = {
            k: (bool(v) if hasattr(v, 'item') and str(type(v)).find('bool') >= 0 
                else float(v) if hasattr(v, 'item') and str(type(v)).find('float') >= 0 
                else v) 
            for k, v in face_result.items()
        }
        
        return {
            "success": True,
            "message": "Face recognition test completed",
            "embeddings_count": len(embeddings_result.data),
            "valid_embeddings": len(stored_embeddings),
            "face_verification": face_result,
            "recommendations": {
                "confidence_score": face_result.get("confidence", 0),
                "threshold": face_result.get("threshold", 0.3),
                "status": "PASS" if face_result.get("match", False) else "FAIL",
                "suggestions": [
                    "Ensure good lighting conditions" if face_result.get("confidence", 0) < 0.1 else None,
                    "Try to face the camera directly" if face_result.get("confidence", 0) < 0.2 else None,
                    "Consider re-registering with clearer images" if face_result.get("confidence", 0) < 0.15 else None,
                    "Recognition looks good!" if face_result.get("confidence", 0) > 0.3 else None
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Error in face recognition test: {str(e)}")
        return {
            "success": False,
            "message": f"Test failed: {str(e)}",
            "error": str(e)
        }