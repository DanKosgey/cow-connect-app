-- Migration: 20251006_add_missing_route_tables.sql
-- Description: Add missing tables for route management (routes, collection_points, route_points) and update collections table
-- Rollback: DROP TABLE IF EXISTS route_points, collection_points, routes CASCADE; ALTER TABLE collections DROP COLUMN IF EXISTS collection_point_id;

BEGIN;

-- Routes table
CREATE TABLE IF NOT EXISTS public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Collection points table
CREATE TABLE IF NOT EXISTS public.collection_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location geography(POINT, 4326), -- PostGIS point type for GPS coordinates
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Route points table (junction table between routes and collection_points)
CREATE TABLE IF NOT EXISTS public.route_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  collection_point_id uuid NOT NULL REFERENCES public.collection_points(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(route_id, sequence_number)
);

-- Add collection_point_id to collections table
ALTER TABLE IF EXISTS public.collections
  ADD COLUMN IF NOT EXISTS collection_point_id uuid REFERENCES public.collection_points(id) ON DELETE SET NULL;

-- Update staff_routes to reference routes
ALTER TABLE IF EXISTS public.staff_routes
  ADD COLUMN IF NOT EXISTS route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_points_route_id ON public.route_points (route_id);
CREATE INDEX IF NOT EXISTS idx_route_points_collection_point_id ON public.route_points (collection_point_id);
CREATE INDEX IF NOT EXISTS idx_staff_routes_route_id ON public.staff_routes (route_id);
CREATE INDEX IF NOT EXISTS idx_collection_points_location ON public.collection_points USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_collections_collection_point_id ON public.collections (collection_point_id);

COMMIT;