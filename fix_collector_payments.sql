-- Fix collector payments by updating approved_for_payment status
-- This will set approved_for_payment = true for all collections that are approved_for_company = true
UPDATE public.collections 
SET approved_for_payment = true 
WHERE approved_for_company = true AND approved_for_payment = false;