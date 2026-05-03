-- Add check_email_available RPC for real-time email availability checking during sign-up.
-- Granted to anon to allow pre-authentication calls from the sign-up wizard.
CREATE OR REPLACE FUNCTION public.check_email_available(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(check_email)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_email_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO authenticated;
