
-- Drop all existing policies on participants table to ensure clean slate
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.participants;
DROP POLICY IF EXISTS "allow_trip_member_select" ON public.participants;
DROP POLICY IF EXISTS "allow_trip_member_update" ON public.participants;

-- Create a very simple and permissive INSERT policy for testing
CREATE POLICY "authenticated_users_can_insert_participants" ON public.participants
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create a simple SELECT policy that allows viewing participants
CREATE POLICY "authenticated_users_can_select_participants" ON public.participants
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create a simple UPDATE policy
CREATE POLICY "authenticated_users_can_update_participants" ON public.participants
  FOR UPDATE 
  TO authenticated
  USING (true);
