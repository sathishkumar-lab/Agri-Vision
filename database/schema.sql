-- ==============================================================================
-- Agri-Vision: Enterprise PostgreSQL Database Schema
-- Version: 1.0.0
-- Purpose: Crop Insurance Claim Verification, Observation Timelines & Audit Engine
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Farmers Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farmers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    mobile_number TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmers_mobile ON farmers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_farmers_code ON farmers(farmer_code);

-- ------------------------------------------------------------------------------
-- 2. Farms Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    farm_code TEXT UNIQUE NOT NULL,
    crop_type TEXT NOT NULL,
    area_acres NUMERIC(10, 2) NOT NULL,
    survey_number TEXT,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_farmer_id ON farms(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farms_coords ON farms(latitude, longitude);

-- ------------------------------------------------------------------------------
-- 3. Field Insurance Officers Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_officers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    officer_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    badge_number TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_officers_email ON field_officers(email);
CREATE INDEX IF NOT EXISTS idx_officers_code ON field_officers(officer_code);

-- ------------------------------------------------------------------------------
-- 4. Crop Observations Table (Seasonal Field Monitoring)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    observation_code TEXT UNIQUE NOT NULL,
    observation_date TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    gps_accuracy NUMERIC(10, 2) DEFAULT 5.0,
    gps_source TEXT DEFAULT 'browser',
    status TEXT NOT NULL DEFAULT 'uploading',
    image_count INT DEFAULT 0,
    close_up_count INT DEFAULT 0,
    field_view_count INT DEFAULT 0,
    disease_result TEXT,
    disease_confidence NUMERIC(5, 2),
    damage_percentage NUMERIC(5, 2),
    evidence_score INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_observations_farm_id ON observations(farm_id);
CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(observation_date);

-- ------------------------------------------------------------------------------
-- 5. Observation Images Table (Close-up & Field-view Evidence)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observation_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    image_type TEXT NOT NULL, -- 'close_up' or 'field_view'
    observation_zone TEXT NOT NULL, -- 'North', 'South', 'Center', etc.
    original_filename TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disease_prediction JSONB,
    damage_prediction JSONB
);

CREATE INDEX IF NOT EXISTS idx_obs_images_obs_id ON observation_images(observation_id);

-- ------------------------------------------------------------------------------
-- 6. Crop Claim Analysis & Officer Verification Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_claim_analysis (
    claim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    farmer_code TEXT,
    farm_code TEXT,
    observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
    observation_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ai_evidence JSONB NOT NULL,
    officer_name TEXT,
    officer_decision TEXT, -- 'approved', 'rejected', 'flagged_for_field_visit'
    officer_notes TEXT,
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_claims_farmer_id ON crop_claim_analysis(farmer_id);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON crop_claim_analysis(created_at);
