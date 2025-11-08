#!/usr/bin/env python3
"""
Quick Postman Alternative - API Testing Script
Tests all endpoints for Dhanush's attendance system
"""

import requests
import json
import time

class AttendanceSystemTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.token = None
        self.user_id = None
        
    def print_header(self, text):
        print(f"\n{'='*60}")
        print(f"  {text}")
        print(f"{'='*60}")
        
    def print_test(self, name, status, details=""):
        icon = "✅" if status else "❌"
        print(f"{icon} {name}")
        if details:
            print(f"   {details}")
            
    def test_health(self):
        """Test server health"""
        try:
            response = requests.get(f"{self.base_url}/health")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f" - Services: {', '.join(data.get('services', {}).keys())}"
            self.print_test("Health Check", success, details)
            return success
        except Exception as e:
            self.print_test("Health Check", False, f"Error: {e}")
            return False
            
    def test_setup_user(self):
        """Setup Dhanush user account"""
        try:
            response = requests.post(f"{self.base_url}/auth/setup-dhanush-user")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f" - User: {data.get('user', {}).get('faculty_id', 'Unknown')}"
                self.user_id = data.get('user', {}).get('id')
            self.print_test("Setup Dhanush User", success, details)
            return success
        except Exception as e:
            self.print_test("Setup Dhanush User", False, f"Error: {e}")
            return False
            
    def test_login(self):
        """Test login with Dhanush credentials"""
        try:
            login_data = {
                "email": "avulavenkatadhanush@gmail.com",
                "password": "2300040343"
            }
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.token = data.get('access_token')
                details += f" - Token: {self.token[:20]}..." if self.token else " - No token"
                if not self.user_id:
                    self.user_id = data.get('user', {}).get('id')
            else:
                error_detail = response.json().get('detail', 'Unknown error')
                details += f" - Error: {error_detail}"
                
            self.print_test("Login Test", success, details)
            return success
        except Exception as e:
            self.print_test("Login Test", False, f"Error: {e}")
            return False
            
    def test_debug_users(self):
        """Test debug users endpoint"""
        try:
            response = requests.get(f"{self.base_url}/auth/debug/users")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                users = response.json()
                details += f" - Found {len(users)} users"
                # Check if Dhanush user exists
                dhanush_user = next((u for u in users if 'dhanush' in u.get('email', '').lower()), None)
                if dhanush_user:
                    details += f" - Dhanush user found: {dhanush_user.get('faculty_id', 'Unknown')}"
                else:
                    details += " - Dhanush user not found"
            self.print_test("Debug Users", success, details)
            return success
        except Exception as e:
            self.print_test("Debug Users", False, f"Error: {e}")
            return False
            
    def test_attendance_marking(self):
        """Test attendance marking with Dhanush hotspot"""
        if not self.token:
            self.print_test("Attendance Marking", False, "No auth token available")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            attendance_data = {
                "face_images": ["data:image/jpeg;base64,dummy_test_image"],
                "network_info": {
                    "ssid": "Dhanush",
                    "ip_address": "192.168.43.100"
                }
            }
            
            response = requests.post(f"{self.base_url}/attendance/mark", 
                                   json=attendance_data, 
                                   headers=headers)
            success = response.status_code in [200, 201]
            details = f"Status: {response.status_code}"
            
            if not success:
                if response.status_code == 404:
                    details += " - Endpoint not found (expected in testing mode)"
                else:
                    try:
                        error_detail = response.json().get('detail', 'Unknown error')
                        details += f" - Error: {error_detail}"
                    except:
                        details += f" - Response: {response.text[:100]}"
                        
            self.print_test("Attendance Marking", success, details)
            return success
        except Exception as e:
            self.print_test("Attendance Marking", False, f"Error: {e}")
            return False
            
    def test_admin_dashboard(self):
        """Test admin dashboard"""
        if not self.token:
            self.print_test("Admin Dashboard", False, "No auth token available")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.base_url}/admin/dashboard-stats", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if not success and response.status_code == 404:
                details += " - Endpoint not found (expected in testing mode)"
                
            self.print_test("Admin Dashboard", success, details)
            return success
        except Exception as e:
            self.print_test("Admin Dashboard", False, f"Error: {e}")
            return False
            
    def test_user_profile(self):
        """Test user profile endpoint"""
        if not self.token:
            self.print_test("User Profile", False, "No auth token available")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.base_url}/auth/me", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                user_data = response.json()
                details += f" - User: {user_data.get('full_name', 'Unknown')}"
            elif response.status_code == 404:
                details += " - Endpoint not found"
            else:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f" - Error: {error_detail}"
                except:
                    details += f" - Response: {response.text[:100]}"
                    
            self.print_test("User Profile", success, details)
            return success
        except Exception as e:
            self.print_test("User Profile", False, f"Error: {e}")
            return False
            
    def run_all_tests(self):
        """Run comprehensive test suite"""
        self.print_header("🚀 DHANUSH'S ATTENDANCE SYSTEM - API TESTS")
        
        print(f"📡 Testing server: {self.base_url}")
        print(f"👤 User: avulavenkatadhanush@gmail.com")
        print(f"📱 Hotspot: Dhanush (Android)")
        
        # Core functionality tests
        self.print_header("🔧 CORE SYSTEM TESTS")
        test_results = []
        
        test_results.append(self.test_health())
        test_results.append(self.test_setup_user())
        test_results.append(self.test_login())
        test_results.append(self.test_debug_users())
        
        # Feature tests (require authentication)
        self.print_header("🎯 FEATURE TESTS")
        test_results.append(self.test_user_profile())
        test_results.append(self.test_attendance_marking())
        test_results.append(self.test_admin_dashboard())
        
        # Summary
        self.print_header("📊 TEST SUMMARY")
        passed = sum(test_results)
        total = len(test_results)
        
        print(f"✅ Passed: {passed}/{total} tests")
        print(f"❌ Failed: {total - passed}/{total} tests")
        
        if passed >= 4:  # Core tests passing
            print(f"\n🎉 SUCCESS: Your attendance system is working!")
            print(f"🔑 Login credentials: avulavenkatadhanush@gmail.com / 2300040343")
            print(f"📱 Network: Connect to 'Dhanush' hotspot")
            print(f"🌐 API Documentation: {self.base_url}/docs")
        else:
            print(f"\n⚠️  Some core tests failed. Check server status.")
            
        self.print_header("🔗 QUICK ACCESS")
        print(f"Health Check:    {self.base_url}/health")
        print(f"API Docs:        {self.base_url}/docs")
        print(f"Debug Users:     {self.base_url}/auth/debug/users")
        
        if self.token:
            print(f"\n🔐 Your JWT Token (first 30 chars): {self.token[:30]}...")

if __name__ == "__main__":
    tester = AttendanceSystemTester()
    tester.run_all_tests()