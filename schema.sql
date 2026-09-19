-- Schema for P.A.R.S.E (Packet Analyser and Risk Scoring Engine)

-- Enable UUID extension if not already enabled (common in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMIN PROFILES TABLE
-- Extends Supabase's default auth.users for Auth Integration
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- 2. PACKET METADATA TABLE
-- Logs all captured network anomalies and metadata sent from the FastAPI backend
CREATE TABLE IF NOT EXISTS packet_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    config_id VARCHAR(50) NOT NULL,
    repeat_id INTEGER DEFAULT 1,
    mode VARCHAR(50) DEFAULT 'live',
    ike_version VARCHAR(50),
    cipher VARCHAR(50),
    dh_group VARCHAR(50),
    pfs VARCHAR(50),
    traffic_type VARCHAR(100) NOT NULL,
    capture_type VARCHAR(50) DEFAULT 'live',
    packet_count INTEGER NOT NULL,
    ike_packet_count INTEGER NOT NULL,
    esp_packet_count INTEGER NOT NULL,
    plain_icmp_count INTEGER NOT NULL,
    pcap_size_bytes BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'success',
    risk_score INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign Key linking the packet capture event to the admin who initiated it
    captured_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL
);

-- 3. INDEXES
-- Optimized querying for dashboard real-time statistics
CREATE INDEX idx_packet_metadata_risk ON packet_metadata(risk_score);
CREATE INDEX idx_packet_metadata_type ON packet_metadata(traffic_type);
CREATE INDEX idx_packet_metadata_timestamp ON packet_metadata(timestamp DESC);
