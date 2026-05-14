-- 1. Ensure 'university_boundaries' table exists with correct types
CREATE TABLE IF NOT EXISTS university_boundaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_name TEXT UNIQUE NOT NULL,
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    created_by UUID REFERENCES users(id),
    snapshot_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add 'role' column to 'users' table if it doesn't exist
-- Options: 'user', 'admin'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- 3. Create RPC for fetching university boundaries as GeoJSON
CREATE OR REPLACE FUNCTION get_university_boundary_geojson(p_university_name TEXT)
RETURNS TABLE (
    id UUID,
    university_name TEXT,
    geojson TEXT,
    snapshot_url TEXT,
    created_by UUID,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id,
        ub.university_name,
        ST_AsGeoJSON(ub.boundary) AS geojson,
        ub.snapshot_url,
        ub.created_by,
        ub.updated_at
    FROM university_boundaries ub
    WHERE ub.university_name = p_university_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create RPC for fetching ALL university boundaries as GeoJSON
CREATE OR REPLACE FUNCTION get_all_university_boundaries_geojson()
RETURNS TABLE (
    id UUID,
    university_name TEXT,
    geojson TEXT,
    snapshot_url TEXT,
    created_by UUID,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id,
        ub.university_name,
        ST_AsGeoJSON(ub.boundary) AS geojson,
        ub.snapshot_url,
        ub.created_by,
        ub.updated_at
    FROM university_boundaries ub
    ORDER BY ub.university_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create RPC for checking if a point is inside a university boundary
CREATE OR REPLACE FUNCTION check_user_inside_university(p_university_name TEXT, p_lat FLOAT8, p_lng FLOAT8)
RETURNS BOOLEAN AS $$
DECLARE
    is_inside BOOLEAN;
BEGIN
    SELECT ST_Within(
        ST_SetSRID(ST_Point(p_lng, p_lat), 4326),
        ub.boundary
    ) INTO is_inside
    FROM university_boundaries ub
    WHERE ub.university_name = p_university_name
    LIMIT 1;

    RETURN COALESCE(is_inside, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Set Alice as admin (User-specific requested state)
-- Replace with actual email if 'alice@example.com' is just an example
UPDATE users SET role = 'admin' WHERE name ILIKE '%Alice%';

-- ✅ Migration Complete
