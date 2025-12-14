-- Refresh PostgREST schema cache to recognize relationships
NOTIFY pgrst, 'reload schema';