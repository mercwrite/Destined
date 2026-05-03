CREATE OR REPLACE FUNCTION public.check_email_available(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(check_email)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO authenticated;
