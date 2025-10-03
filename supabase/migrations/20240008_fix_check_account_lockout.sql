-- Migration: 20240008_fix_check_account_lockout.sql
-- Make check_account_lockout a SECURITY DEFINER function and grant execute to public
BEGIN;

-- Replace function with SECURITY DEFINER so it can be executed without an authenticated session
CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email text)
RETURNS TABLE(is_locked boolean, attempts_remaining integer, locked_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM public.account_lockouts WHERE email = p_email;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::boolean, 5::integer, NULL::timestamptz;
    RETURN;
  END IF;

  IF r.locked_until IS NOT NULL AND r.locked_until > now() THEN
    RETURN QUERY SELECT true::boolean, 0::integer, r.locked_until;
  ELSE
    RETURN QUERY SELECT false::boolean, GREATEST(0, 5 - r.attempts)::integer, NULL::timestamptz;
  END IF;
END;
$$;

-- Allow anyone to execute this helper RPC (it only reads from account_lockouts)
GRANT EXECUTE ON FUNCTION public.check_account_lockout(text) TO public;

COMMIT;
