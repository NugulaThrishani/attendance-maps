"""
Simple local testing database for development
This is used when Supabase is not available
"""

import json
import os
from typing import List, Dict, Optional
import uuid
from datetime import datetime
import hashlib

class TestingDatabase:
    def __init__(self, db_path: str = "testing_db.json"):
        self.db_path = db_path
        self.data = self._load_db()
    
    def _load_db(self) -> Dict:
        """Load database from file or create empty"""
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'r') as f:
                    return json.load(f)
            except:
                pass
        
        # Default empty database structure
        return {
            "users": [],
            "face_embeddings": [],
            "attendance": [],
            "network_config": [
                {
                    "id": str(uuid.uuid4()),
                    "ssid": "Dhanush",
                    "ip_range": "192.168.43.0/24",
                    "is_active": True,
                    "created_at": datetime.now().isoformat()
                }
            ]
        }
    
    def _save_db(self):
        """Save database to file"""
        with open(self.db_path, 'w') as f:
            json.dump(self.data, f, indent=2, default=str)
    
    def table(self, table_name: str):
        """Get table interface"""
        return TestingTable(self, table_name)

class TestingTable:
    def __init__(self, db: TestingDatabase, table_name: str):
        self.db = db
        self.table_name = table_name
        self.query_filters = {}
        self.select_fields = "*"
    
    def select(self, fields: str = "*"):
        """Select fields"""
        self.select_fields = fields
        return self
    
    def eq(self, field: str, value):
        """Add equals filter"""
        self.query_filters[field] = value
        return self
    
    def execute(self):
        """Execute query and return result"""
        table_data = self.db.data.get(self.table_name, [])
        
        # Apply filters
        filtered_data = []
        for record in table_data:
            match = True
            for field, value in self.query_filters.items():
                if record.get(field) != value:
                    match = False
                    break
            if match:
                filtered_data.append(record)
        
        # Return mock response similar to Supabase
        class MockResponse:
            def __init__(self, data):
                self.data = data
            
            def execute(self):
                """Execute method for compatibility"""
                return self
        
        return MockResponse(filtered_data)
    
    def insert(self, data: Dict):
        """Insert data"""
        # Add ID and timestamps if not present
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        if "created_at" not in data:
            data["created_at"] = datetime.now().isoformat()
        
        # Ensure table exists
        if self.table_name not in self.db.data:
            self.db.data[self.table_name] = []
        
        self.db.data[self.table_name].append(data)
        self.db._save_db()
        
        class MockResponse:
            def __init__(self, data):
                self.data = [data] if data else []
            
            def execute(self):
                """Execute method for compatibility"""
                return self
        
        return MockResponse(data)
    
    def update(self, data: Dict):
        """Update data"""
        table_data = self.db.data.get(self.table_name, [])
        
        updated_records = []
        for i, record in enumerate(table_data):
            match = True
            for field, value in self.query_filters.items():
                if record.get(field) != value:
                    match = False
                    break
            
            if match:
                # Update record
                record.update(data)
                record["updated_at"] = datetime.now().isoformat()
                updated_records.append(record)
        
        self.db._save_db()
        
        class MockResponse:
            def __init__(self, data):
                self.data = data
            
            def execute(self):
                """Execute method for compatibility"""
                return self
        
        return MockResponse(updated_records)

# Global testing database instance
testing_db = TestingDatabase()

def get_testing_db():
    """Get testing database instance"""
    return testing_db

def get_testing_admin_db():
    """Get testing admin database instance (same as regular)"""
    return testing_db