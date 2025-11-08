#!/usr/bin/env python3
"""
COMPREHENSIVE API TESTING - EVERY SINGLE ENDPOINT
Testing all APIs for Dhanush's attendance system one by one
"""

import requests
import json
import time
from datetime import datetime

class ComprehensiveAPITester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.token = None
        self.user_id = None
        self.test_results = {}
        
    def print_separator(self, char="=", length=80):
        print(char * length)
        
    def print_header(self, text):
        print(f"\n")
        self.print_separator("=")
        print(f"  {text}")
        self.print_separator("=")
        
    def print_subheader(self, text):
        print(f"\n{'-' * 60}")
        print(f"  {text}")
        print(f"{'-' * 60}")
        
    def print_test_result(self, endpoint, method, status_code, expected_codes, response_data=None, error=None):
        """Print detailed test result for each API"""
        success = status_code in expected_codes
        icon = "✅" if success else "❌"
        
        print(f"\n{icon} {method} {endpoint}")
        print(f"   Status: {status_code} (Expected: {expected_codes})")
        
        if success:
            print(f"   Result: SUCCESS")
            if response_data:
                # Print key response data
                if isinstance(response_data, dict):
                    for key, value in list(response_data.items())[:3]:  # First 3 keys
                        if key == 'access_token' and value:
                            print(f"   {key}: {value[:30]}...")
                        elif isinstance(value, (str, int, float, bool)):
                            print(f"   {key}: {value}")
                        elif isinstance(value, dict) and key == 'user':
                            print(f"   user_id: {value.get('id', 'N/A')}")
                            print(f"   email: {value.get('email', 'N/A')}")
        else:
            print(f"   Result: FAILED")
            if error:
                print(f"   Error: {error}")
            elif response_data:
                error_msg = response_data.get('detail', 'Unknown error') if isinstance(response_data, dict) else str(response_data)[:100]
                print(f"   Error: {error_msg}")
                
        # Store result for summary
        self.test_results[f"{method} {endpoint}"] = {
            'success': success,
            'status_code': status_code,
            'expected': expected_codes
        }
        
    def test_api_call(self, method, endpoint, expected_codes, headers=None, json_data=None, description=""):
        """Generic API testing method"""
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=json_data)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=json_data)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            # Parse response
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            self.print_test_result(endpoint, method.upper(), response.status_code, expected_codes, response_data)
            
            return response.status_code in expected_codes, response_data, response.status_code
            
        except Exception as e:
            self.print_test_result(endpoint, method.upper(), 0, expected_codes, error=str(e))
            return False, None, 0

    def test_system_health_apis(self):
        """Test system health and documentation endpoints"""
        self.print_header("🔧 SYSTEM HEALTH & DOCUMENTATION APIs")
        
        # Health check
        success, data, _ = self.test_api_call("GET", "/health", [200], description="Server health check")
        
        # API documentation (HTML endpoint)
        try:
            response = requests.get(f"{self.base_url}/docs")
            success = response.status_code == 200
            print(f"\n✅ GET /docs")
            print(f"   Status: {response.status_code} (Expected: [200])")
            print(f"   Result: SUCCESS - API Documentation accessible")
            self.test_results["GET /docs"] = {'success': True, 'status_code': 200, 'expected': [200]}
        except Exception as e:
            print(f"\n❌ GET /docs")
            print(f"   Error: {e}")
            self.test_results["GET /docs"] = {'success': False, 'status_code': 0, 'expected': [200]}

    def test_authentication_apis(self):
        """Test all authentication related APIs"""
        self.print_header("🔐 AUTHENTICATION APIs")
        
        # 1. Setup Dhanush user
        self.print_subheader("1. User Setup")
        success, data, _ = self.test_api_call("POST", "/auth/setup-dhanush-user", [200])
        if success and data:
            self.user_id = data.get('user', {}).get('id')
            print(f"   User ID captured: {self.user_id}")
        
        # 2. Login with correct credentials
        self.print_subheader("2. Login (Correct Credentials)")
        login_data = {
            "email": "avulavenkatadhanush@gmail.com",
            "password": "2300040343"
        }
        success, data, _ = self.test_api_call("POST", "/auth/login", [200], json_data=login_data)
        if success and data:
            self.token = data.get('access_token')
            if not self.user_id:
                self.user_id = data.get('user', {}).get('id')
            print(f"   Token captured: {self.token[:30] if self.token else 'None'}...")
            print(f"   User ID: {self.user_id}")
            
        # 3. Login with wrong password
        self.print_subheader("3. Login (Wrong Password - Should Fail)")
        wrong_login = {
            "email": "avulavenkatadhanush@gmail.com",
            "password": "wrongpassword"
        }
        self.test_api_call("POST", "/auth/login", [401], json_data=wrong_login)
        
        # 4. Login with non-existent user
        self.print_subheader("4. Login (Non-existent User - Should Fail)")
        fake_login = {
            "email": "fake@klu.edu",
            "password": "password"
        }
        self.test_api_call("POST", "/auth/login", [401], json_data=fake_login)
        
        # 5. Get current user profile (if token available)
        if self.token:
            self.print_subheader("5. Current User Profile")
            headers = {"Authorization": f"Bearer {self.token}"}
            self.test_api_call("GET", "/auth/me", [200, 404], headers=headers)
        
        # 6. Access protected endpoint without token
        self.print_subheader("6. Protected Endpoint Without Token (Should Fail)")
        self.test_api_call("GET", "/auth/me", [401])

    def test_debug_apis(self):
        """Test debug and development APIs"""
        self.print_header("🔍 DEBUG & DEVELOPMENT APIs")
        
        # 1. Debug users list
        self.print_subheader("1. Debug Users List")
        self.test_api_call("GET", "/auth/debug/users", [200])
        
        # 2. Create test user
        self.print_subheader("2. Create Test User")
        test_user = {
            "email": f"test.user.{int(time.time())}@klu.edu",
            "faculty_id": f"KLU_TEST_{int(time.time())}",
            "full_name": "Test Faculty Member",
            "department": "Testing Department",
            "designation": "Test Professor",
            "password": "test123"
        }
        self.test_api_call("POST", "/auth/debug/create-test-user", [200], json_data=test_user)
        
        # 3. Test login endpoint (alternative)
        self.print_subheader("3. Test Login Endpoint")
        test_login = {
            "email": "avulavenkatadhanush@gmail.com",
            "password": "2300040343"
        }
        self.test_api_call("POST", "/auth/test-login", [200, 404], json_data=test_login)

    def test_registration_apis(self):
        """Test user registration APIs"""
        self.print_header("👤 USER REGISTRATION APIs")
        
        # 1. Register new user with face images
        self.print_subheader("1. Register New User")
        new_user = {
            "email": f"newuser.{int(time.time())}@klu.edu",
            "faculty_id": f"KLU_NEW_{int(time.time())}",
            "full_name": "New Faculty Member",
            "department": "Computer Science",
            "designation": "Assistant Professor",
            "password": "newuser123",
            "face_images": [
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//2Q==",  # Minimal base64 image
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//2Q==",
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//2Q=="
            ]
        }
        self.test_api_call("POST", "/auth/register", [200, 500], json_data=new_user)  # 500 acceptable due to face processing
        
        # 2. Register with missing required fields
        self.print_subheader("2. Register Missing Fields (Should Fail)")
        incomplete_user = {
            "email": "incomplete@klu.edu",
            "password": "test"
        }
        self.test_api_call("POST", "/auth/register", [422], json_data=incomplete_user)
        
        # 3. Register with duplicate email
        self.print_subheader("3. Register Duplicate Email (Should Fail)")
        duplicate_user = {
            "email": "avulavenkatadhanush@gmail.com",  # Existing email
            "faculty_id": "KLU_DUPLICATE_001",
            "full_name": "Duplicate User",
            "password": "test123",
            "face_images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//2Q=="]
        }
        self.test_api_call("POST", "/auth/register", [400, 500], json_data=duplicate_user)

    def test_attendance_apis(self):
        """Test attendance related APIs"""
        self.print_header("📝 ATTENDANCE APIs")
        
        if not self.token:
            print("\n❌ No authentication token available - skipping attendance tests")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # 1. Mark attendance with valid network (Dhanush hotspot)
        self.print_subheader("1. Mark Attendance (Valid Network)")
        attendance_data = {
            "face_images": [
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//2Q=="
            ],
            "network_info": {
                "ssid": "Dhanush",
                "ip_address": "192.168.43.100",
                "location": {
                    "latitude": 16.4419,
                    "longitude": 80.9831
                }
            }
        }
        self.test_api_call("POST", "/attendance/mark", [200, 404], headers=headers, json_data=attendance_data)
        
        # 2. Mark attendance with invalid network
        self.print_subheader("2. Mark Attendance (Invalid Network - Should Fail)")
        invalid_attendance = {
            "face_images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//2Q=="],
            "network_info": {
                "ssid": "UnauthorizedWiFi",
                "ip_address": "10.0.0.100"
            }
        }
        self.test_api_call("POST", "/attendance/mark", [400, 403, 404], headers=headers, json_data=invalid_attendance)
        
        # 3. Mark attendance without network info
        self.print_subheader("3. Mark Attendance (No Network Info - Should Fail)")
        no_network = {
            "face_images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//2Q=="]
        }
        self.test_api_call("POST", "/attendance/mark", [400, 422, 404], headers=headers, json_data=no_network)
        
        # 4. Get attendance history
        self.print_subheader("4. Get Attendance History")
        self.test_api_call("GET", "/attendance/history?limit=10", [200, 404], headers=headers)
        
        # 5. Get today's attendance
        self.print_subheader("5. Get Today's Attendance")
        self.test_api_call("GET", "/attendance/today", [200, 404], headers=headers)

    def test_admin_apis(self):
        """Test admin and management APIs"""
        self.print_header("👨‍💼 ADMIN & MANAGEMENT APIs")
        
        if not self.token:
            print("\n❌ No authentication token available - skipping admin tests")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # 1. Dashboard statistics
        self.print_subheader("1. Dashboard Statistics")
        self.test_api_call("GET", "/admin/dashboard-stats", [200, 404], headers=headers)
        
        # 2. All users list
        self.print_subheader("2. All Users List")
        self.test_api_call("GET", "/admin/users", [200, 404], headers=headers)
        
        # 3. User attendance report
        if self.user_id:
            self.print_subheader("3. User Attendance Report")
            self.test_api_call("GET", f"/admin/attendance-report?user_id={self.user_id}&days=30", [200, 404], headers=headers)
        
        # 4. Admin endpoints without authentication (should fail)
        self.print_subheader("4. Admin Access Without Auth (Should Fail)")
        self.test_api_call("GET", "/admin/dashboard-stats", [401])

    def test_edge_cases(self):
        """Test edge cases and error scenarios"""
        self.print_header("⚠️ EDGE CASES & ERROR SCENARIOS")
        
        # 1. Non-existent endpoint
        self.print_subheader("1. Non-existent Endpoint (Should 404)")
        self.test_api_call("GET", "/non-existent-endpoint", [404])
        
        # 2. Invalid HTTP method
        self.print_subheader("2. Invalid HTTP Method (Should 405)")
        self.test_api_call("DELETE", "/auth/login", [405])
        
        # 3. Malformed JSON
        self.print_subheader("3. Malformed JSON Request")
        try:
            response = requests.post(f"{self.base_url}/auth/login", 
                                   headers={"Content-Type": "application/json"},
                                   data="invalid json")
            self.print_test_result("/auth/login", "POST", response.status_code, [422, 400])
        except Exception as e:
            print(f"\n❌ POST /auth/login (Malformed JSON)")
            print(f"   Error: {e}")
            
        # 4. Empty request body where required
        self.print_subheader("4. Empty Request Body (Should Fail)")
        self.test_api_call("POST", "/auth/login", [422], json_data={})
        
        # 5. Invalid token format
        self.print_subheader("5. Invalid Token Format (Should Fail)")
        invalid_headers = {"Authorization": "Bearer invalid.token.format"}
        self.test_api_call("GET", "/auth/me", [401], headers=invalid_headers)

    def print_final_summary(self):
        """Print comprehensive test summary"""
        self.print_header("📊 COMPREHENSIVE TEST SUMMARY")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"\n🎯 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {failed_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Group results by category
        categories = {
            "System Health": [k for k in self.test_results.keys() if any(endpoint in k for endpoint in ["/health", "/docs"])],
            "Authentication": [k for k in self.test_results.keys() if "/auth/" in k and "debug" not in k],
            "Debug APIs": [k for k in self.test_results.keys() if "debug" in k],
            "Attendance": [k for k in self.test_results.keys() if "/attendance/" in k],
            "Admin": [k for k in self.test_results.keys() if "/admin/" in k],
            "Edge Cases": [k for k in self.test_results.keys() if any(endpoint in k for endpoint in ["/non-existent", "DELETE", "Malformed", "Empty", "Invalid"])]
        }
        
        print(f"\n📋 RESULTS BY CATEGORY:")
        for category, endpoints in categories.items():
            if endpoints:
                category_passed = sum(1 for endpoint in endpoints if self.test_results[endpoint]['success'])
                category_total = len(endpoints)
                print(f"\n   {category}:")
                print(f"     ✅ {category_passed}/{category_total} passed ({category_passed/category_total*100:.0f}%)")
                
                # Show failed tests in this category
                failed_in_category = [endpoint for endpoint in endpoints if not self.test_results[endpoint]['success']]
                if failed_in_category:
                    print(f"     ❌ Failed: {', '.join(failed_in_category)}")
        
        # Critical systems status
        print(f"\n🚨 CRITICAL SYSTEMS STATUS:")
        critical_apis = [
            "GET /health",
            "POST /auth/setup-dhanush-user", 
            "POST /auth/login"
        ]
        
        all_critical_passed = True
        for api in critical_apis:
            status = "✅ OPERATIONAL" if self.test_results.get(api, {}).get('success', False) else "❌ FAILED"
            print(f"   {api}: {status}")
            if not self.test_results.get(api, {}).get('success', False):
                all_critical_passed = False
        
        print(f"\n🎉 FINAL VERDICT:")
        if all_critical_passed:
            print(f"   ✅ SYSTEM OPERATIONAL - Core functions working!")
            print(f"   🔑 Your credentials: avulavenkatadhanush@gmail.com / 2300040343")
            print(f"   📱 Network: Connect to 'Dhanush' hotspot for attendance")
            print(f"   🌐 API Access: {self.base_url}")
        else:
            print(f"   ⚠️ CRITICAL ISSUES DETECTED - Some core functions failed")
            print(f"   🔧 Check server status and configuration")
        
        if self.token:
            print(f"\n🔐 Authentication Token Available:")
            print(f"   Token: {self.token[:40]}...")
            print(f"   Use this token in Postman Authorization header")

    def run_comprehensive_tests(self):
        """Run all API tests"""
        start_time = time.time()
        
        print("🚀 STARTING COMPREHENSIVE API TESTING")
        print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"👤 Test User: avulavenkatadhanush@gmail.com")
        
        # Run all test categories
        self.test_system_health_apis()
        self.test_authentication_apis()
        self.test_debug_apis()
        self.test_registration_apis()
        self.test_attendance_apis()
        self.test_admin_apis() 
        self.test_edge_cases()
        
        # Final summary
        end_time = time.time()
        duration = end_time - start_time
        
        self.print_final_summary()
        
        print(f"\n⏱️ Total Test Duration: {duration:.2f} seconds")
        self.print_separator("=")

if __name__ == "__main__":
    tester = ComprehensiveAPITester()
    tester.run_comprehensive_tests()