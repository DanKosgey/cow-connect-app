-- Migration: 20251007_add_warehouse_location_fields.sql
-- Description: Add GPS location fields to warehouses table for mapping and route optimization
-- Rollback: ALTER TABLE public.warehouses DROP COLUMN IF EXISTS gps_latitude, DROP COLUMN IF EXISTS gps_longitude;

BEGIN;

-- Add GPS location fields to warehouses table
ALTER TABLE IF EXISTS public.warehouses
  ADD COLUMN IF NOT EXISTS gps_latitude numeric,
  ADD COLUMN IF NOT EXISTS gps_longitude numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create indexes for location fields
CREATE INDEX IF NOT EXISTS idx_warehouses_gps_latitude ON public.warehouses (gps_latitude);
CREATE INDEX IF NOT EXISTS idx_warehouses_gps_longitude ON public.warehouses (gps_longitude);

-- Update existing warehouses with default location (Nairobi, Kenya)
-- This is just for demonstration - in a real system, you would update with actual locations
UPDATE public.warehouses 
SET 
  gps_latitude = -1.2921 + (RANDOM() - 0.5) * 0.1,
  gps_longitude = 36.8219 + (RANDOM() - 0.5) * 0.1,
  updated_at = NOW()
WHERE gps_latitude IS NULL OR gps_longitude IS NULL;

-- Create function to calculate distance between two GPS points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 numeric,
  lng1 numeric,
  lat2 numeric,
  lng2 numeric
) RETURNS numeric AS $$
DECLARE
  R numeric := 6371; -- Earth's radius in kilometers
  dLat numeric;
  dLng numeric;
  a numeric;
  c numeric;
  distance numeric;
BEGIN
  -- Convert degrees to radians
  dLat := RADIANS(lat2 - lat1);
  dLng := RADIANS(lng2 - lng1);
  
  -- Haversine formula
  a := SIN(dLat/2) * SIN(dLat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dLng/2) * SIN(dLng/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  distance := R * c;
  
  RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- Create function to find nearest warehouse to a collection point
CREATE OR REPLACE FUNCTION public.find_nearest_warehouse(
  collection_lat numeric,
  collection_lng numeric
) RETURNS uuid AS $$
DECLARE
  nearest_warehouse_id uuid;
BEGIN
  SELECT id INTO nearest_warehouse_id
  FROM public.warehouses
  WHERE gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL
  ORDER BY public.calculate_distance(gps_latitude, gps_longitude, collection_lat, collection_lng)
  LIMIT 1;
  
  RETURN nearest_warehouse_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;