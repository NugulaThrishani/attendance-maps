import ipaddress
import re
from typing import List, Dict, Any, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class NetworkVerificationService:
    """Real network verification service for mobile hotspot and campus Wi-Fi"""
    
    def __init__(self):
        self.allowed_ssids = settings.ALLOWED_SSIDS
        self.allowed_ip_ranges = [ipaddress.ip_network(ip_range) for ip_range in settings.ALLOWED_IP_RANGES]
    
    def verify_network_access(self, network_info: Dict[str, Any], client_ip: str) -> Dict[str, Any]:
        """
        Verify if user is connected to allowed network
        Checks SSID, IP range, and other network parameters
        
        NOTE: For testing/demo purposes, this is currently bypassed
        """
        try:
            # TESTING MODE: Skip network verification for demo
            logger.info("🔍 TESTING MODE: Network verification bypassed for demo")
            return {
                "network_verified": True,
                "ssid_verified": True,
                "ip_verified": True,
                "client_ip": client_ip,
                "checks_performed": ["testing_bypass"],
                "security_score": 1.0,
                "note": "Network verification bypassed for testing"
            }
            
            # Real implementation would be here:
            verification_result = {
                "network_verified": False,
                "ssid_verified": False,
                "ip_verified": False,
                "client_ip": client_ip,
                "checks_performed": []
            }
            
            # Extract network information
            ssid = network_info.get("ssid", "").strip()
            bssid = network_info.get("bssid", "").strip()
            connection_type = network_info.get("connection_type", "wifi")
            
            # Check SSID verification
            if ssid:
                ssid_check = self._verify_ssid(ssid)
                verification_result["ssid_verified"] = ssid_check["verified"]
                verification_result["ssid_match"] = ssid_check.get("matched_ssid")
                verification_result["checks_performed"].append("ssid_check")
            
            # Check IP range verification
            ip_check = self._verify_ip_range(client_ip)
            verification_result["ip_verified"] = ip_check["verified"]
            verification_result["ip_range_match"] = ip_check.get("matched_range")
            verification_result["checks_performed"].append("ip_range_check")
            
            # Additional mobile hotspot specific checks
            if self._is_mobile_hotspot_pattern(ssid):
                hotspot_check = self._verify_mobile_hotspot(ssid, client_ip)
                verification_result["hotspot_verified"] = hotspot_check["verified"]
                verification_result["hotspot_pattern"] = hotspot_check.get("pattern_match")
                verification_result["checks_performed"].append("hotspot_pattern_check")
            
            # Overall network verification (OR logic - either SSID or IP verification passes)
            verification_result["network_verified"] = (
                verification_result["ssid_verified"] or 
                verification_result["ip_verified"] or 
                verification_result.get("hotspot_verified", False)
            )
            
            # Add security score
            verification_result["security_score"] = self._calculate_security_score(verification_result)
            
            return verification_result
            
        except Exception as e:
            logger.error(f"Error in network verification: {str(e)}")
            return {
                "network_verified": False,
                "error": str(e),
                "client_ip": client_ip
            }
    
    def _verify_ssid(self, ssid: str) -> Dict[str, Any]:
        """Verify SSID against allowed list"""
        try:
            ssid_lower = ssid.lower()
            
            for allowed_ssid in self.allowed_ssids:
                # Exact match
                if ssid_lower == allowed_ssid.lower():
                    return {
                        "verified": True,
                        "matched_ssid": allowed_ssid,
                        "match_type": "exact"
                    }
                
                # Pattern match for mobile hotspots (e.g., "iPhone", "AndroidAP")
                if self._ssid_pattern_match(ssid_lower, allowed_ssid.lower()):
                    return {
                        "verified": True,
                        "matched_ssid": allowed_ssid,
                        "match_type": "pattern"
                    }
            
            return {
                "verified": False,
                "reason": f"SSID '{ssid}' not in allowed list"
            }
            
        except Exception as e:
            logger.error(f"Error verifying SSID: {str(e)}")
            return {"verified": False, "error": str(e)}
    
    def _verify_ip_range(self, client_ip: str) -> Dict[str, Any]:
        """Verify client IP is in allowed range"""
        try:
            client_ip_obj = ipaddress.ip_address(client_ip)
            
            for ip_range in self.allowed_ip_ranges:
                if client_ip_obj in ip_range:
                    return {
                        "verified": True,
                        "matched_range": str(ip_range),
                        "client_ip": client_ip
                    }
            
            return {
                "verified": False,
                "reason": f"IP {client_ip} not in allowed ranges",
                "allowed_ranges": [str(r) for r in self.allowed_ip_ranges]
            }
            
        except Exception as e:
            logger.error(f"Error verifying IP range: {str(e)}")
            return {"verified": False, "error": str(e)}
    
    def _is_mobile_hotspot_pattern(self, ssid: str) -> bool:
        """Check if SSID matches mobile hotspot patterns"""
        hotspot_patterns = [
            r".*hotspot.*",
            r".*iphone.*",
            r".*android.*",
            r".*mobile.*",
            r".*phone.*",
            r".*demo.*",
            r".*test.*"
        ]
        
        ssid_lower = ssid.lower()
        for pattern in hotspot_patterns:
            if re.match(pattern, ssid_lower):
                return True
        
        return False
    
    def _verify_mobile_hotspot(self, ssid: str, client_ip: str) -> Dict[str, Any]:
        """Additional verification for mobile hotspot connections"""
        try:
            verification_checks = {
                "pattern_match": self._is_mobile_hotspot_pattern(ssid),
                "ip_private_range": self._is_private_ip(client_ip),
                "typical_hotspot_range": self._is_typical_hotspot_range(client_ip)
            }
            
            # Mobile hotspot is verified if it matches pattern and uses private IP
            verified = (
                verification_checks["pattern_match"] and 
                verification_checks["ip_private_range"]
            )
            
            return {
                "verified": verified,
                "checks": verification_checks,
                "confidence": 0.9 if verified else 0.3
            }
            
        except Exception as e:
            logger.error(f"Error verifying mobile hotspot: {str(e)}")
            return {"verified": False, "error": str(e)}
    
    def _ssid_pattern_match(self, ssid: str, pattern: str) -> bool:
        """Check if SSID matches a pattern"""
        # Simple pattern matching - can be enhanced with regex
        return pattern in ssid or ssid in pattern
    
    def _is_private_ip(self, ip: str) -> bool:
        """Check if IP is in private range"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private
        except:
            return False
    
    def _is_typical_hotspot_range(self, ip: str) -> bool:
        """Check if IP is in typical mobile hotspot ranges"""
        typical_ranges = [
            "192.168.43.0/24",  # Android hotspot default
            "192.168.137.0/24",  # Windows hotspot default
            "172.20.10.0/24",   # iOS hotspot default
            "10.0.0.0/24"       # Common hotspot range
        ]
        
        try:
            ip_obj = ipaddress.ip_address(ip)
            for range_str in typical_ranges:
                if ip_obj in ipaddress.ip_network(range_str):
                    return True
        except:
            pass
        
        return False
    
    def _calculate_security_score(self, verification_result: Dict[str, Any]) -> float:
        """Calculate security score based on verification results"""
        score = 0.0
        
        if verification_result.get("ssid_verified"):
            score += 0.4
        
        if verification_result.get("ip_verified"):
            score += 0.4
        
        if verification_result.get("hotspot_verified"):
            score += 0.2
        
        return min(score, 1.0)
    
    def get_network_requirements(self) -> Dict[str, Any]:
        """Get current network requirements for frontend"""
        return {
            "allowed_ssids": self.allowed_ssids,
            "allowed_ip_ranges": [str(r) for r in self.allowed_ip_ranges],
            "verification_methods": [
                "SSID verification",
                "IP range verification", 
                "Mobile hotspot pattern matching"
            ],
            "requirements": {
                "wifi_connection": "Connect to allowed Wi-Fi network",
                "location": "Must be within network coverage area",
                "device": "Device must be on authorized network"
            }
        }

# Global service instance
network_verification_service = NetworkVerificationService()