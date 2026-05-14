-- Migration to add missing columns for Circle Vault and Invitations

-- 1. Add 'status' column to 'circle_members' table if it doesn't exist
-- This is used for the invitation flow (pending, accepted, etc.)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='circle_members' AND column_name='status') THEN
        ALTER TABLE circle_members ADD COLUMN status TEXT DEFAULT 'accepted';
    END IF;
END $$;

-- 2. Add 'location_id' column to 'circles' table if it doesn't exist
-- This is used for linking circles to specific points of interest
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='circles' AND column_name='location_id') THEN
        ALTER TABLE circles ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Notify PostgREST to reload the schema cache
-- This is often done by reloading the schema or restarting the service, 
-- but in Supabase it's automatic after a DDL change.
-- However, if the error persists, the user might need to manually click 'Reload Schema' in Supabase Dashboard.
