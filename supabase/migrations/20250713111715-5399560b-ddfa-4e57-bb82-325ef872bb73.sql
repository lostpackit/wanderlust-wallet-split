-- Create a debug function to check auth context
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'jwt_claims', auth.jwt(),
    'current_timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a temporary permissive policy for testing
CREATE POLICY "Temporary debug policy for expenses" 
ON public.expenses FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Comment explaining this is temporary
COMMENT ON POLICY "Temporary debug policy for expenses" ON public.expenses IS 'Temporary policy for debugging auth context issues. Should be removed once auth is fixed.';