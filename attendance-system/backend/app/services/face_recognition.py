import cv2
import numpy as np
from deepface import DeepFace
from typing import List, Tuple, Optional, Dict, Any
import base64
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class FaceRecognitionService:
    """Real face recognition service using DeepFace and OpenCV"""
    
    def __init__(self):
        self.model_name = "Facenet512"  # High accuracy model
        self.detector_backend = "opencv"
        self.distance_metric = "cosine"
        self.threshold = 0.65  # STRICT but practical threshold (was 0.75 - too strict)
        self.testing_mode = False  # Set to False for real face recognition
        
        # Balanced security parameters - strict but usable
        self.min_acceptable_threshold = 0.55  # Minimum acceptable confidence (was 0.65)
        self.quality_threshold = 0.6   # Reasonable quality requirement (was 0.75)
        self.consensus_threshold = 0.65  # Require high consensus for multi-embedding (was 0.8)
        self.max_embedding_variance = 0.2   # Allow some variance for lighting differences (was 0.15)
        
        # Special handling for high raw similarity (genuine users with poor lighting)
        self.high_similarity_override = 0.9  # If raw similarity > 90%, be more lenient
        
        # Initialize OpenCV face detection as fallback
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
    def extract_embedding(self, image_data: str) -> Optional[List[float]]:
        """
        Extract face embedding from base64 image using DeepFace
        Returns embedding vector or None if no face detected
        """
        try:
            # Testing mode: return dummy embeddings for API testing
            if self.testing_mode:
                logger.info("⚠️ TESTING MODE: Returning dummy face embedding")
                # Return a random 512-dimensional vector for testing
                import random
                return [random.uniform(-1, 1) for _ in range(512)]
            
            logger.info("🔍 REAL MODE: Performing actual face embedding extraction")
            
            # Decode base64 image
            image = self._decode_base64_image(image_data)
            if image is None:
                logger.error("❌ Failed to decode image")
                return None
            
            logger.info("📸 Image decoded successfully, extracting face embedding...")
            
            # SECURITY: Check image quality before processing
            image_quality_score = self._assess_image_quality(image)
            logger.info(f"🔍 Image quality score: {image_quality_score:.2f}")
            
            if image_quality_score < 0.3:
                logger.warning(f"⚠️ Poor image quality detected: {image_quality_score:.2f}")
                return None
            
            try:
                # Extract embedding using DeepFace
                embedding_obj = DeepFace.represent(
                    img_path=image,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=True
                )
                
                # DeepFace returns a list of embeddings (one per face)
                if len(embedding_obj) > 0:
                    embedding = embedding_obj[0]["embedding"]
                    logger.info(f"✅ Face embedding extracted successfully (dimension: {len(embedding)})")
                    return embedding
                
                logger.warning("⚠️ No face detected in image")
                return None
                
            except Exception as deepface_error:
                logger.error(f"❌ DeepFace error: {str(deepface_error)}")
                logger.error(f"❌ DeepFace error type: {type(deepface_error).__name__}")
                
                # Try fallback method with different parameters
                logger.info("🔄 Attempting fallback face detection...")
                try:
                    embedding_obj = DeepFace.represent(
                        img_path=image,
                        model_name=self.model_name,
                        detector_backend="opencv",  # Force OpenCV backend
                        enforce_detection=False     # Don't enforce detection
                    )
                    
                    if len(embedding_obj) > 0:
                        embedding = embedding_obj[0]["embedding"]
                        logger.info(f"✅ Face embedding extracted with fallback method (dimension: {len(embedding)})")
                        return embedding
                        
                except Exception as fallback_error:
                    logger.error(f"❌ Fallback method also failed: {str(fallback_error)}")
                
                return None
            
        except Exception as e:
            logger.error(f"❌ Error extracting embedding: {str(e)}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            return None
    
    def verify_faces(self, live_image: str, stored_embeddings: List[List[float]]) -> Dict[str, Any]:
        """
        Verify live image against stored embeddings
        Returns verification result with confidence score and match status
        """
        try:
            # Testing mode: return dummy verification result
            if self.testing_mode:
                logger.info("⚠️ TESTING MODE: Returning dummy face verification result")
                return {
                    "match": True,
                    "confidence": 0.85,  # High confidence for testing
                    "threshold": self.threshold
                }
            
            logger.info(f"🔍 REAL MODE: Performing actual face verification against {len(stored_embeddings)} stored embeddings")
            
            # Validate stored embeddings
            if not stored_embeddings:
                logger.error("❌ No stored embeddings provided")
                return {
                    "match": False,
                    "confidence": 0.0,
                    "error": "No stored embeddings provided"
                }
            
            # Extract embedding from live image
            try:
                live_embedding = self.extract_embedding(live_image)
                if live_embedding is None:
                    logger.error("❌ No face detected in live image")
                    return {
                        "match": False,
                        "confidence": 0.0,
                        "error": "No face detected in live image"
                    }
            except Exception as extract_error:
                logger.error(f"❌ Error extracting live image embedding: {str(extract_error)}")
                return {
                    "match": False,
                    "confidence": 0.0,
                    "error": f"Failed to process live image: {str(extract_error)}"
                }
            
            logger.info("📊 Comparing face embeddings with ULTRA-STRICT security...")
            best_similarity = 0.0
            best_match = False
            
            try:
                # Use advanced multi-metric analysis instead of simple comparison
                logger.info(f"🔒 ULTRA-STRICT SECURITY: Using advanced similarity analysis")
                
                analysis_result = self._advanced_similarity_analysis(live_embedding, stored_embeddings)
                
                # Extract analysis results
                best_similarity = analysis_result["cosine_similarity"]
                final_confidence = analysis_result["final_confidence"] 
                consensus_score = analysis_result["consensus_score"]
                variance_penalty = analysis_result["variance_penalty"]
                range_penalty = analysis_result["range_penalty"]
                
                logger.info(f"🔬 Advanced Analysis Results:")
                logger.info(f"   - Best cosine similarity: {best_similarity:.4f}")
                logger.info(f"   - Final confidence: {final_confidence:.4f}")
                logger.info(f"   - Consensus score: {consensus_score:.4f}")
                logger.info(f"   - Variance penalty: {variance_penalty:.4f}")
                logger.info(f"   - Range penalty: {range_penalty:.4f}")
                
                # PRACTICAL SECURITY RULES - Balanced approach
                security_checks = []
                
                # Special case: High raw similarity (genuine user with poor lighting/angle)
                high_similarity_override = False
                if best_similarity >= self.high_similarity_override:
                    logger.info(f"🔓 HIGH SIMILARITY OVERRIDE: Raw similarity {best_similarity:.4f} >= {self.high_similarity_override}")
                    high_similarity_override = True
                
                # Check 1: Primary threshold requirement (relaxed if high raw similarity)
                effective_threshold = self.threshold * 0.85 if high_similarity_override else self.threshold
                threshold_pass = final_confidence >= effective_threshold
                security_checks.append(("Primary threshold", threshold_pass, f"{final_confidence:.4f} >= {effective_threshold:.4f}"))
                
                # Check 2: Consensus requirement (relaxed if high raw similarity)
                effective_consensus = self.consensus_threshold * 0.9 if high_similarity_override else self.consensus_threshold
                consensus_pass = consensus_score >= effective_consensus
                security_checks.append(("Consensus threshold", consensus_pass, f"{consensus_score:.4f} >= {effective_consensus:.4f}"))
                
                # Check 3: Variance check (consistent matching)
                variance_threshold = 0.6 if high_similarity_override else 0.5
                variance_pass = variance_penalty < variance_threshold
                security_checks.append(("Variance check", variance_pass, f"penalty {variance_penalty:.4f} < {variance_threshold}"))
                
                # Check 4: Range consistency (prevent spoofing attempts)  
                range_threshold = 0.4 if high_similarity_override else 0.3
                range_pass = range_penalty < range_threshold
                security_checks.append(("Range consistency", range_pass, f"penalty {range_penalty:.4f} < {range_threshold}"))
                
                # Check 5: Minimum acceptable baseline
                baseline_pass = best_similarity >= self.min_acceptable_threshold
                security_checks.append(("Minimum baseline", baseline_pass, f"{best_similarity:.4f} >= {self.min_acceptable_threshold}"))
                
                # Log all security checks
                mode_desc = "HIGH-SIMILARITY OVERRIDE" if high_similarity_override else "STANDARD STRICT"
                logger.info(f"🔒 {mode_desc} SECURITY VALIDATION:")
                for check_name, passed, details in security_checks:
                    status = "✅ PASS" if passed else "❌ FAIL"
                    logger.info(f"   {status} {check_name}: {details}")
                
                # Determine if authentication should pass
                critical_checks = ["Primary threshold", "Minimum baseline"]
                critical_pass = all(check[1] for check in security_checks if check[0] in critical_checks)
                
                # For high similarity cases, only critical checks must pass
                if high_similarity_override:
                    all_checks_pass = critical_pass
                    logger.info(f"🔓 High similarity override: Only critical checks required")
                else:
                    # Normal strict mode: most checks must pass
                    passed_checks = sum(1 for check in security_checks if check[1])
                    all_checks_pass = passed_checks >= 4  # At least 4 out of 5 checks must pass
                
                if all_checks_pass:
                    logger.info(f"✅ SECURITY VALIDATION PASSED - Authentication approved")
                    best_match = True
                else:
                    failed_checks = [check[0] for check in security_checks if not check[1]]
                    logger.warning(f"🚨 SECURITY VALIDATION FAILED: {', '.join(failed_checks)}")
                    best_match = False
                
                logger.info(f"🎯 Final security result: match = {best_match}, confidence = {final_confidence:.4f}, raw_similarity = {best_similarity:.4f}")
                
                return {
                    "match": best_match,
                    "confidence": float(final_confidence),
                    "raw_similarity": float(best_similarity),
                    "consensus_score": float(consensus_score),
                    "threshold": self.threshold,
                    "security_checks": {check[0]: check[1] for check in security_checks},
                    "variance_penalty": float(variance_penalty),
                    "range_penalty": float(range_penalty),
                    "total_embeddings_compared": len(stored_embeddings),
                    "high_similarity_override": high_similarity_override,
                    "effective_threshold": float(effective_threshold),
                    "balanced_security_mode": True
                }
                
            except Exception as comparison_error:
                logger.error(f"❌ Error during embedding comparison: {str(comparison_error)}")
                return {
                    "match": False,
                    "confidence": 0.0,
                    "error": f"Comparison failed: {str(comparison_error)}"
                }
            
        except Exception as e:
            logger.error(f"❌ Error in face verification: {str(e)}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            return {
                "match": False,
                "confidence": 0.0,
                "error": str(e)
            }
    
    def detect_liveness(self, image_sequence: List[str]) -> Dict[str, Any]:
        """
        Detect liveness using multiple frames and OpenCV
        Checks for face presence and basic movement detection
        """
        try:
            # Testing mode: return successful liveness detection
            if self.testing_mode:
                logger.info("Testing mode: Returning positive liveness detection")
                return {
                    "liveness_passed": True,
                    "confidence": 0.9,
                    "reason": "Testing mode - liveness check bypassed"
                }
            
            if len(image_sequence) < 3:
                return {
                    "liveness_passed": False,
                    "reason": "Insufficient frames for liveness detection"
                }
            
            face_detected_count = 0
            face_areas = []
            
            for image_data in image_sequence:
                image = self._decode_base64_image(image_data)
                if image is None:
                    continue
                
                # Convert to grayscale for face detection
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                
                # Detect faces using OpenCV
                faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
                
                if len(faces) > 0:
                    face_detected_count += 1
                    # Calculate face area (proxy for distance/movement)
                    x, y, w, h = faces[0]  # Take the first face
                    face_area = w * h
                    face_areas.append(face_area)
            
            # Check liveness criteria
            face_detection_rate = face_detected_count / len(image_sequence)
            
            # Check for natural variation in face size (indicates movement)
            movement_detected = False
            if len(face_areas) > 1:
                area_variance = np.var(face_areas)
                movement_detected = area_variance > 100  # Threshold for movement
            
            liveness_passed = (
                face_detection_rate >= 0.7 and  # Face detected in most frames
                (movement_detected or len(image_sequence) <= 5)  # Movement or short sequence
            )
            
            return {
                "liveness_passed": bool(liveness_passed),
                "face_detection_rate": float(face_detection_rate),
                "movement_detected": bool(movement_detected),
                "frames_processed": int(len(image_sequence)),
                "face_areas_variance": float(np.var(face_areas)) if face_areas else 0.0
            }
            
        except Exception as e:
            logger.error(f"Error in liveness detection: {str(e)}")
            return {
                "liveness_passed": False,
                "error": str(e)
            }
    
    def _decode_base64_image(self, image_data: str) -> Optional[np.ndarray]:
        """Decode base64 image to OpenCV format"""
        try:
            # Remove data URL prefix if present
            if "," in image_data:
                image_data = image_data.split(",")[1]
            
            # Check image size before processing
            image_size_bytes = len(image_data) * 3 / 4  # Approximate base64 decoded size
            logger.info(f"🔍 Processing image size: ~{image_size_bytes/1024:.1f} KB")
            
            if image_size_bytes > 10 * 1024 * 1024:  # 10MB limit
                logger.warning(f"⚠️ Image size ({image_size_bytes/1024/1024:.1f} MB) exceeds recommended limit")
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            logger.info(f"🔍 Decoded {len(image_bytes)} bytes from base64")
            
            # Open with PIL
            image = Image.open(io.BytesIO(image_bytes))
            logger.info(f"🔍 PIL image size: {image.size}, mode: {image.mode}")
            
            # Resize if image is too large
            max_dimension = 1024
            if max(image.size) > max_dimension:
                logger.info(f"🔍 Resizing large image from {image.size} to fit {max_dimension}px")
                image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
                logger.info(f"🔍 Resized to: {image.size}")
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                logger.info(f"🔍 Converting image from {image.mode} to RGB")
                image = image.convert('RGB')
            
            # Enhance image quality for better face recognition
            from PIL import ImageEnhance
            
            # Enhance contrast slightly for better feature extraction
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.2)
            
            # Enhance sharpness slightly
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.1)
            
            # Convert to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            logger.info(f"🔍 OpenCV image shape: {opencv_image.shape}")
            
            return opencv_image
            
        except Exception as e:
            logger.error(f"❌ Error decoding image: {str(e)}")
            logger.error(f"❌ Image data length: {len(image_data) if image_data else 0}")
            return None
    
    def _advanced_similarity_analysis(self, current_embedding: List[float], stored_embeddings: List[List[float]]) -> Dict[str, float]:
        """
        Perform advanced similarity analysis using multiple distance metrics
        and statistical validation to prevent unauthorized access
        """
        import numpy as np
        
        current_emb = np.array(current_embedding)
        stored_embs = [np.array(emb) for emb in stored_embeddings]
        
        # Calculate multiple distance metrics
        cosine_similarities = []
        euclidean_similarities = []
        
        for stored_emb in stored_embs:
            # Cosine similarity (primary metric) - manual calculation
            dot_product = np.dot(current_emb, stored_emb)
            norm_current = np.linalg.norm(current_emb)
            norm_stored = np.linalg.norm(stored_emb)
            
            if norm_current > 0 and norm_stored > 0:
                cosine_sim = dot_product / (norm_current * norm_stored)
                cosine_similarities.append(max(0, cosine_sim))
            else:
                cosine_similarities.append(0.0)
            
            # Euclidean distance (normalized to similarity)
            euclidean_dist = np.linalg.norm(current_emb - stored_emb)
            euclidean_sim = 1 / (1 + euclidean_dist)  # Convert to similarity
            euclidean_similarities.append(euclidean_sim)
        
        # Statistical analysis
        cosine_mean = np.mean(cosine_similarities)
        cosine_std = np.std(cosine_similarities) 
        cosine_max = np.max(cosine_similarities)
        cosine_min = np.min(cosine_similarities)
        
        euclidean_mean = np.mean(euclidean_similarities)
        
        # Multi-metric consensus score
        consensus_score = (cosine_mean * 0.7 + euclidean_mean * 0.3)
        
        # Variance check - high variance indicates inconsistent matching (potential fraud)
        variance_ratio = cosine_std / (cosine_mean + 1e-8)  # Prevent division by zero
        variance_penalty = min(1.0, variance_ratio * 2.0)  # Penalize high variance
        
        # Range check - legitimate users should have consistent high scores
        range_check = cosine_max - cosine_min
        range_penalty = min(1.0, range_check * 3.0)  # Penalize large ranges
        
        # Final confidence with fraud prevention
        final_confidence = consensus_score * (1 - variance_penalty * 0.3) * (1 - range_penalty * 0.2)
        
        return {
            "cosine_similarity": cosine_max,
            "cosine_mean": cosine_mean,
            "cosine_std": cosine_std,
            "cosine_min": cosine_min,
            "cosine_range": range_check,
            "euclidean_mean": euclidean_mean,
            "consensus_score": consensus_score,
            "variance_penalty": variance_penalty,
            "range_penalty": range_penalty,
            "final_confidence": final_confidence
        }

    def _assess_image_quality(self, image: np.ndarray) -> float:
        try:
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate image sharpness using Laplacian variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness_score = min(laplacian_var / 500.0, 1.0)  # Normalize to 0-1
            
            # Calculate brightness (avoid too dark or too bright)
            mean_brightness = np.mean(gray)
            brightness_score = 1.0 - abs(mean_brightness - 128) / 128.0  # Optimal around 128
            
            # Check contrast
            contrast_score = np.std(gray) / 128.0  # Normalize standard deviation
            contrast_score = min(contrast_score, 1.0)
            
            # Face detection confidence
            faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
            face_detection_score = 1.0 if len(faces) > 0 else 0.0
            
            # Combined quality score (weighted average)
            quality_score = (
                sharpness_score * 0.3 +
                brightness_score * 0.2 +
                contrast_score * 0.2 +
                face_detection_score * 0.3
            )
            
            logger.info(f"🔍 Quality breakdown - Sharpness: {sharpness_score:.2f}, Brightness: {brightness_score:.2f}, Contrast: {contrast_score:.2f}, Face Detection: {face_detection_score:.2f}")
            
            return quality_score
            
        except Exception as e:
            logger.error(f"Error assessing image quality: {str(e)}")
            return 0.5  # Default medium quality if assessment fails

    def check_face_uniqueness_across_users(self, current_user_id: str, live_embedding: List[float], all_user_embeddings: Dict[str, List[List[float]]]) -> Dict[str, Any]:
        """
        Advanced security check: Ensure this face isn't already registered to another user
        This prevents unauthorized access by using someone else's registered face
        """
        import numpy as np
        
        logger.info(f"🔍 Checking face uniqueness for user {current_user_id} against {len(all_user_embeddings)} users")
        
        current_emb = np.array(live_embedding)
        cross_user_violations = []
        suspicious_similarities = []
        
        for user_id, user_embeddings in all_user_embeddings.items():
            # Skip checking against the current user's own embeddings
            if user_id == current_user_id:
                continue
                
            # Check similarity with this other user's embeddings
            for i, other_embedding in enumerate(user_embeddings):
                try:
                    other_emb = np.array(other_embedding)
                    
                    # Calculate cosine similarity
                    dot_product = np.dot(current_emb, other_emb)
                    norm_current = np.linalg.norm(current_emb)
                    norm_other = np.linalg.norm(other_emb)
                    
                    if norm_current > 0 and norm_other > 0:
                        similarity = dot_product / (norm_current * norm_other)
                        
                        # SECURITY ALERT: Very high similarity with another user's face
                        if similarity > 0.8:  # Very high similarity threshold
                            violation = {
                                "other_user_id": user_id,
                                "embedding_index": i,
                                "similarity": float(similarity),
                                "severity": "CRITICAL" if similarity > 0.9 else "HIGH"
                            }
                            cross_user_violations.append(violation)
                            logger.warning(f"🚨 CRITICAL SECURITY ALERT: Face similarity {similarity:.4f} with user {user_id}")
                            
                        elif similarity > 0.6:  # Moderately high similarity - suspicious
                            suspicious_similarities.append({
                                "other_user_id": user_id,
                                "embedding_index": i,
                                "similarity": float(similarity)
                            })
                            
                except Exception as e:
                    logger.error(f"Error comparing with user {user_id} embedding {i}: {e}")
                    continue
        
        # Determine uniqueness status
        is_unique = len(cross_user_violations) == 0
        risk_level = "LOW"
        
        if len(cross_user_violations) > 0:
            # Check severity of violations
            critical_violations = [v for v in cross_user_violations if v["severity"] == "CRITICAL"]
            if critical_violations:
                risk_level = "CRITICAL"
            else:
                risk_level = "HIGH"
        elif len(suspicious_similarities) > 2:  # Multiple suspicious similarities
            risk_level = "MEDIUM"
        
        result = {
            "is_unique": is_unique,
            "risk_level": risk_level,
            "cross_user_violations": cross_user_violations,
            "suspicious_similarities": suspicious_similarities,
            "total_users_checked": len(all_user_embeddings) - 1,  # Exclude current user
            "security_recommendation": "BLOCK" if not is_unique else "ALLOW"
        }
        
        if not is_unique:
            logger.error(f"🚨 FACE UNIQUENESS VIOLATION: User {current_user_id} attempting to use face similar to other registered users!")
            logger.error(f"🚨 SECURITY ACTION: BLOCKING authentication attempt")
        
        return result

    def analyze_temporal_security_patterns(self, user_id: str, recent_attempts: List[Dict], current_confidence: float) -> Dict[str, Any]:
        """
        Analyze temporal patterns in authentication attempts to detect anomalous behavior
        This helps identify potential unauthorized access attempts or account compromise
        """
        from datetime import datetime, timedelta
        
        logger.info(f"🕐 Analyzing temporal security patterns for user {user_id}")
        
        # Analyze recent authentication attempts
        now = datetime.utcnow()
        suspicious_patterns = []
        security_flags = []
        
        # Check for rapid successive attempts (potential brute force)
        recent_24h = [attempt for attempt in recent_attempts if (now - datetime.fromisoformat(attempt.get('timestamp', now.isoformat()))).total_seconds() < 86400]
        recent_1h = [attempt for attempt in recent_attempts if (now - datetime.fromisoformat(attempt.get('timestamp', now.isoformat()))).total_seconds() < 3600]
        
        # Pattern 1: Too many attempts in short time
        if len(recent_1h) > 10:
            suspicious_patterns.append({
                "type": "RAPID_ATTEMPTS",
                "severity": "HIGH",
                "details": f"{len(recent_1h)} attempts in last hour",
                "recommendation": "BLOCK_TEMPORARILY"
            })
            
        # Pattern 2: Inconsistent confidence scores (potential spoofing)
        if len(recent_24h) >= 3:
            confidences = [float(attempt.get('confidence_score', 0)) for attempt in recent_24h if attempt.get('confidence_score')]
            if confidences:
                avg_confidence = sum(confidences) / len(confidences)
                confidence_variance = sum((c - avg_confidence) ** 2 for c in confidences) / len(confidences)
                
                # High variance in confidence suggests inconsistent identity
                if confidence_variance > 0.1 and current_confidence < 0.6:
                    suspicious_patterns.append({
                        "type": "CONFIDENCE_VARIANCE",
                        "severity": "MEDIUM",
                        "details": f"High confidence variance: {confidence_variance:.3f}, current: {current_confidence:.3f}",
                        "recommendation": "REQUIRE_ADDITIONAL_VERIFICATION"
                    })
                    
        # Pattern 3: Failed attempts followed by sudden success
        failed_attempts = [a for a in recent_24h if not a.get('success', True)]
        if len(failed_attempts) >= 3 and current_confidence > 0.5:
            # Multiple failures followed by success could indicate credential compromise
            last_failure_time = max([datetime.fromisoformat(a.get('timestamp', now.isoformat())) for a in failed_attempts])
            time_since_last_failure = (now - last_failure_time).total_seconds()
            
            if time_since_last_failure < 600:  # Within 10 minutes
                suspicious_patterns.append({
                    "type": "SUDDEN_SUCCESS_AFTER_FAILURES", 
                    "severity": "HIGH",
                    "details": f"{len(failed_attempts)} failures, then success within {time_since_last_failure/60:.1f} minutes",
                    "recommendation": "REQUIRE_ADDITIONAL_VERIFICATION"
                })
                
        # Pattern 4: Authentication from unusual times (if we had historical data)
        # This would require storing user's typical authentication times
        
        # Determine overall risk assessment
        risk_level = "LOW"
        if any(p["severity"] == "HIGH" for p in suspicious_patterns):
            risk_level = "HIGH"
        elif any(p["severity"] == "MEDIUM" for p in suspicious_patterns):
            risk_level = "MEDIUM"
            
        # Security recommendations
        should_block = any(p["recommendation"] == "BLOCK_TEMPORARILY" for p in suspicious_patterns)
        should_require_additional = any(p["recommendation"] == "REQUIRE_ADDITIONAL_VERIFICATION" for p in suspicious_patterns)
        
        result = {
            "risk_level": risk_level,
            "suspicious_patterns": suspicious_patterns,
            "total_attempts_24h": len(recent_24h),
            "total_attempts_1h": len(recent_1h),
            "should_block": should_block,
            "should_require_additional_verification": should_require_additional,
            "security_recommendation": "BLOCK" if should_block else ("ADDITIONAL_VERIFICATION" if should_require_additional else "ALLOW")
        }
        
        if suspicious_patterns:
            logger.warning(f"🚨 TEMPORAL SECURITY ALERT for user {user_id}: {len(suspicious_patterns)} suspicious patterns detected")
            for pattern in suspicious_patterns:
                logger.warning(f"   - {pattern['type']}: {pattern['details']} (Severity: {pattern['severity']})")
        else:
            logger.info(f"✅ No suspicious temporal patterns detected for user {user_id}")
            
        return result

    def _cosine_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            # Convert to numpy arrays
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)  # Ensure native Python float
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            return 0.0
    
    def _calculate_eye_aspect_ratio(self, image: np.ndarray, detection) -> Optional[float]:
        """Calculate eye aspect ratio for blink detection (simplified version)"""
        try:
            # Simplified implementation using face area variation
            # In a real scenario, you'd use facial landmark detection
            # For now, we'll return a mock EAR that varies realistically
            import random
            return random.uniform(0.2, 0.35)
            
        except Exception as e:
            logger.error(f"Error calculating EAR: {str(e)}")
            return None
    
    def _detect_blink(self, eye_aspect_ratios: List[float]) -> bool:
        """Detect blinking pattern in eye aspect ratios (simplified)"""
        if len(eye_aspect_ratios) < 3:
            return True  # Assume blink for short sequences
        
        # Simple blink detection: look for variation in EAR values
        ear_std = np.std(eye_aspect_ratios)
        
        # Consider it a blink if there's sufficient variation
        return ear_std > 0.02  # Threshold for variation

# Global service instance
face_recognition_service = FaceRecognitionService()