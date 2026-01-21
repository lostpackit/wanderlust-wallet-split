-- Fix is_guest_user function to use empty search_path for security consistency
CREATE OR REPLACE FUNCTION public.is_guest_user(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_guest FROM public.profiles WHERE id = user_uuid),
    false
  );
$$;