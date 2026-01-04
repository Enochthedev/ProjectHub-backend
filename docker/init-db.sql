-- Initialize PostgreSQL database for ProjectHub
-- This script runs automatically when the database is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Set default encoding
SET client_encoding = 'UTF8';

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'ProjectHub database initialized successfully';
END $$;
