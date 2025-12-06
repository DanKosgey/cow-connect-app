-- Migration: 202512050001_ai_verification_schema.sql
-- Description: Create tables for AI-powered collection photo verification
-- Estimated time: 1 minute

BEGIN;

-- Create enum for AI verification status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_verification_status_enum') THEN
        CREATE TYPE ai_verification_status_enum AS ENUM ('pending', 'verified', 'flagged', 'needs_review');
    END IF;
END$$;

-- Create table for AI verification results
CREATE TABLE IF NOT EXISTS public.ai_verification_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  estimated_liters numeric,
  recorded_liters numeric,
  matches_recorded boolean,
  confidence_score numeric,
  explanation text,
  verification_passed boolean,
  status ai_verification_status_enum DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for AI instructions (admin configurable)
CREATE TABLE IF NOT EXISTS public.ai_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructions text NOT NULL,
  model_name text DEFAULT 'gemini-2.5-flash',
  confidence_threshold numeric DEFAULT 0.8,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_verification_collection ON public.ai_verification_results (collection_id);
CREATE INDEX IF NOT EXISTS idx_ai_verification_status ON public.ai_verification_results (status);
CREATE INDEX IF NOT EXISTS idx_ai_verification_created ON public.ai_verification_results (created_at DESC);

-- Insert default AI instructions if none exist
INSERT INTO public.ai_instructions (instructions, model_name, confidence_threshold)
SELECT 
  'You are an AI assistant that verifies milk collection photos. Your task is to:
  
  1. Analyze images of milk collections
  2. Estimate the volume of milk shown in the image
  3. Compare your estimate with the recorded liters
  4. Determine if the collection appears legitimate
  
  Focus on:
  - Measuring containers and their fill levels
  - Standard milk collection jugs or tanks
  - Any numerical indicators of volume
  - Overall plausibility of the collection
  
  Be conservative in your estimates. If uncertain, recommend human review.',
  'gemini-2.5-flash',
  0.8
WHERE NOT EXISTS (SELECT 1 FROM public.ai_instructions);

-- Add a column to collections table to link to AI verification
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS ai_verification_id uuid REFERENCES public.ai_verification_results(id) ON DELETE SET NULL;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.ai_verification_results TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_instructions TO authenticated;
GRANT USAGE ON TYPE ai_verification_status_enum TO authenticated;

-- Verification queries
-- Check that tables were created
SELECT tablename FROM pg_tables WHERE tablename IN ('ai_verification_results', 'ai_instructions');

-- Check that enum was created
SELECT typname FROM pg_type WHERE typname = 'ai_verification_status_enum';

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename IN ('ai_verification_results');

-- Check that default instructions were inserted
SELECT COUNT(*) as instruction_count FROM public.ai_instructions;

COMMIT;