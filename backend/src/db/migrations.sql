-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Ensure Table Types are Correct (Fixes jsonb vs geometry issues)
DO $$ 
BEGIN
  -- Convert circle_boundaries.boundary if it's text/json
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'circle_boundaries' AND column_name = 'boundary' AND data_type = 'jsonb') THEN
    ALTER TABLE circle_boundaries ALTER COLUMN boundary TYPE geometry USING ST_SetSRID(ST_GeomFromText(boundary::text), 4326);
  END IF;

  -- Convert university_boundaries.boundary if it's text/json
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'university_boundaries' AND column_name = 'boundary' AND data_type = 'jsonb') THEN
    ALTER TABLE university_boundaries ALTER COLUMN boundary TYPE geometry USING ST_SetSRID(ST_GeomFromText(boundary::text), 4326);
  END IF;
END $$;

-- 1. Create status_transitions table to record history
CREATE TABLE IF NOT EXISTS status_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  transition_type TEXT NOT NULL, -- 'ENTER' or 'EXIT'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_status_transitions_user_circle 
ON status_transitions (user_id, circle_id, timestamp DESC);

-- 2. Optimized Spatial Function
-- Searches all circle boundaries for a specific user in one go
DROP FUNCTION IF EXISTS check_user_inside_circles(UUID, DOUBLE PRECISION, DOUBLE PRECISION);
CREATE OR REPLACE FUNCTION check_user_inside_circles(p_user_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE (id UUID, name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id::UUID, 
    c.name::TEXT
  FROM circles c
  JOIN circle_members cm ON c.id = cm.circle_id
  JOIN circle_boundaries cb ON c.id = cb.circle_id
  WHERE cm.user_id = p_user_id
    AND cm.detection_enabled = TRUE
    AND ST_Contains(cb.boundary, ST_SetSRID(ST_Point(p_lng, p_lat), 4326));
END;
$$ LANGUAGE plpgsql;

-- 3. University Spatial Function
CREATE OR REPLACE FUNCTION check_user_inside_university(p_university_name TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS BOOLEAN AS $$
DECLARE
  v_inside BOOLEAN;
BEGIN
  SELECT 
    ST_Contains(boundary, ST_SetSRID(ST_Point(p_lng, p_lat), 4326))
  INTO v_inside
  FROM university_boundaries
  WHERE university_name = p_university_name;
  
  RETURN COALESCE(v_inside, false);
END;
$$ LANGUAGE plpgsql;

-- 4. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- 5. Add snapshot_updated_at to circles
ALTER TABLE circles ADD COLUMN IF NOT EXISTS snapshot_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. Batch Boundary Retrieval RPC
DROP FUNCTION IF EXISTS get_circle_boundaries_batch(UUID[]);
CREATE OR REPLACE FUNCTION get_circle_boundaries_batch(p_circle_ids UUID[])
RETURNS TABLE(circle_id UUID, geojson TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT cb.circle_id::UUID, ST_AsGeoJSON(cb.boundary)::TEXT
  FROM circle_boundaries cb
  WHERE cb.circle_id = ANY(p_circle_ids);
END;
$$ LANGUAGE plpgsql;

-- 7. Singular Boundary Retrieval RPC
DROP FUNCTION IF EXISTS get_circle_boundary(UUID);
CREATE OR REPLACE FUNCTION get_circle_boundary(p_circle_id UUID)
RETURNS TABLE(circle_id UUID, geojson TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT cb.circle_id::UUID, ST_AsGeoJSON(cb.boundary)::TEXT
  FROM circle_boundaries cb
  WHERE cb.circle_id = p_circle_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Privacy Fields Updates
-- Add university tracking toggle to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS track_university BOOLEAN DEFAULT TRUE;

-- Add granular toggles to circle_members
ALTER TABLE circle_members ADD COLUMN IF NOT EXISTS detection_enabled BOOLEAN DEFAULT TRUE;

-- 9. Cleanup Defunct Privacy Columns
DO $$ 
BEGIN
  -- Drop ghost_mode from users
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ghost_mode') THEN
    ALTER TABLE users DROP COLUMN ghost_mode;
  END IF;

  -- Drop is_ghosted from circle_members
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'circle_members' AND column_name = 'is_ghosted') THEN
    ALTER TABLE circle_members DROP COLUMN is_ghosted;
  END IF;
END $$;

-- 10. Circle Invitation System
ALTER TABLE circle_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active'));
UPDATE circle_members SET status = 'active' WHERE status IS NULL;
ALTER TABLE circle_members ALTER COLUMN status SET NOT NULL;

-- 11. Circle Pruning RPC
CREATE OR REPLACE FUNCTION prune_small_circles()
RETURNS TABLE(deleted_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH small_circles AS (
    SELECT circle_id
    FROM circle_members
    WHERE status = 'active'
    GROUP BY circle_id
    HAVING COUNT(*) < 3
  )
  DELETE FROM circles
  WHERE id IN (SELECT circle_id FROM small_circles)
  RETURNING id::UUID;
END;
$$ LANGUAGE plpgsql;
