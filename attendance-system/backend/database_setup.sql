-- ============================================
-- KL University Faculty Attendance System Database Setup
-- Run these queries in Supabase SQL Editor
-- ============================================

-- 1. Enable pgvector extension for face embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    faculty_id VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR NOT NULL,
    department VARCHAR,
    designation VARCHAR, -- Professor, Associate Professor, Assistant Professor, etc.
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 3. Create face_embeddings table with pgvector support
CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    embedding VECTOR(512), -- 512-dimensional face embedding vectors
    image_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location_verified BOOLEAN DEFAULT false,
    network_ssid VARCHAR,
    device_ip INET,
    confidence_score FLOAT,
    liveness_passed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create network_config table for allowed networks
CREATE TABLE IF NOT EXISTS network_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ssid VARCHAR NOT NULL,
    bssid VARCHAR,
    ip_range CIDR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON face_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_faculty_id ON users(faculty_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_created ON face_embeddings(created_at);

-- 7. Create vector similarity search index for face embeddings (optional, for performance)
-- This creates an approximate nearest neighbor index for faster face matching
CREATE INDEX IF NOT EXISTS idx_face_embeddings_vector 
ON face_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 8. Insert demo network configurations including Dhanush's hotspot
INSERT INTO network_config (ssid, ip_range, is_active) VALUES
('Dhanush', '192.168.43.0/24', true),
('DemoHotspot', '192.168.43.0/24', true),
('AttendanceDemo', '10.0.0.0/24', true),
('TestNetwork', '172.20.10.0/24', true)
ON CONFLICT DO NOTHING;

-- 9. Row Level Security (RLS) Policies for better security
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_config ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy: Users can only see their own face embeddings
CREATE POLICY "Users can view own embeddings" ON face_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = face_embeddings.user_id 
            AND auth.uid()::text = users.id::text
        )
    );

-- Policy: Users can only see their own attendance records
CREATE POLICY "Users can view own attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = attendance.user_id 
            AND auth.uid()::text = users.id::text
        )
    );

-- Policy: Service role can access all data (for backend API)
CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role full access embeddings" ON face_embeddings
    FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role full access attendance" ON attendance
    FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role full access network_config" ON network_config
    FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- 10. Create helpful functions for face matching
-- Function to find similar face embeddings using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_faces(
    query_embedding VECTOR(512),
    similarity_threshold FLOAT DEFAULT 0.6,
    match_count INT DEFAULT 10
)
RETURNS TABLE(
    user_id UUID,
    similarity_score FLOAT
) 
LANGUAGE sql
AS $$
    SELECT 
        fe.user_id,
        1 - (fe.embedding <=> query_embedding) AS similarity_score
    FROM face_embeddings fe
    WHERE 1 - (fe.embedding <=> query_embedding) > similarity_threshold
    ORDER BY fe.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 11. Create attendance statistics view
CREATE OR REPLACE VIEW attendance_stats AS
SELECT 
    u.id,
    u.faculty_id,
    u.full_name,
    u.department,
    u.designation,
    COUNT(a.id) as total_attendance,
    COUNT(CASE WHEN DATE(a.timestamp) = CURRENT_DATE THEN 1 END) as today_attendance,
    COUNT(CASE WHEN a.timestamp >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_attendance,
    COUNT(CASE WHEN a.timestamp >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_attendance,
    AVG(a.confidence_score) as avg_confidence,
    MAX(a.timestamp) as last_attendance
FROM users u
LEFT JOIN attendance a ON u.id = a.user_id
WHERE u.is_active = true
GROUP BY u.id, u.faculty_id, u.full_name, u.department, u.designation;

-- 12. Create daily attendance summary view
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT 
    DATE(a.timestamp) as attendance_date,
    COUNT(*) as total_records,
    COUNT(DISTINCT a.user_id) as unique_users,
    AVG(a.confidence_score) as avg_confidence,
    COUNT(CASE WHEN a.location_verified = true THEN 1 END) as verified_locations,
    COUNT(CASE WHEN a.liveness_passed = true THEN 1 END) as liveness_passed
FROM attendance a
GROUP BY DATE(a.timestamp)
ORDER BY attendance_date DESC;

-- 13. Insert sample test data (optional - for testing)
-- You can uncomment these to add test data
/*
INSERT INTO users (email, faculty_id, full_name, department, designation) VALUES
('faculty1@klu.edu', 'KLU_FAC_001', 'Dr. John Doe', 'Computer Science', 'Professor'),
('faculty2@klu.edu', 'KLU_FAC_002', 'Dr. Jane Smith', 'Information Technology', 'Associate Professor'),
('faculty3@klu.edu', 'KLU_FAC_003', 'Dr. Bob Johnson', 'Electronics', 'Assistant Professor')
ON CONFLICT DO NOTHING;
*/

-- 14. Useful queries for monitoring and debugging

-- Query to check table sizes
-- SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size 
-- FROM pg_tables WHERE schemaname = 'public';

-- Query to check recent attendance
-- SELECT u.faculty_id, u.full_name, a.timestamp, a.confidence_score, a.location_verified 
-- FROM attendance a 
-- JOIN users u ON a.user_id = u.id 
-- ORDER BY a.timestamp DESC LIMIT 10;

-- Query to check face embeddings count per user
-- SELECT u.faculty_id, u.full_name, COUNT(fe.id) as embedding_count
-- FROM users u
-- LEFT JOIN face_embeddings fe ON u.id = fe.user_id
-- GROUP BY u.id, u.faculty_id, u.full_name
-- ORDER BY embedding_count DESC;

-- ============================================
-- Setup Complete!
-- 
-- Your database is now ready for the KL University
-- Faculty Attendance System with face recognition.
-- 
-- Features enabled:
-- ✅ Faculty management with professional profiles
-- ✅ Face embedding storage with pgvector
-- ✅ Attendance tracking with verification
-- ✅ Network configuration for hotspot verification
-- ✅ Row Level Security for data protection
-- ✅ Performance indexes for fast queries
-- ✅ Helper functions for face matching
-- ✅ Statistical views for reporting
-- ============================================