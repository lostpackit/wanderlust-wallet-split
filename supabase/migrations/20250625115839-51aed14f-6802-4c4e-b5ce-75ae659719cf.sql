
-- First, disable RLS temporarily to ensure we can clean up properly
ALTER TABLE public.participants DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on participants table to ensure clean slate
DROP POLICY IF EXISTS "Users can update participants they created" ON public.participants;
DROP POLICY IF EXISTS "Users can create participants" ON public.participants;
DROP POLICY IF EXISTS "Users can update participants in their trips" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;
DROP POLICY IF EXISTS "authenticated_users_can_create_participants" ON public.participants;
DROP POLICY IF EXISTS "users_can_view_trip_participants" ON public.participants;
DROP POLICY IF EXISTS "users_can_update_trip_participants" ON public.participants;
DROP POLICY IF EXISTS "Users can create participants for accessible trips" ON public.participants;
DROP POLICY IF EXISTS "Users can update participants in accessible trips" ON public.participants;

-- Re-enable RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Create new, simplified policies that definitely work
CREATE POLICY "allow_authenticated_insert" ON public.participants
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "allow_trip_member_select" ON public.participants
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.participant_id = participants.id 
      AND public.is_user_trip_member(tp.trip_id, auth.uid())
    )
  );

CREATE POLICY "allow_trip_member_update" ON public.participants
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.participant_id = participants.id 
      AND public.is_user_trip_member(tp.trip_id, auth.uid())
    )
  );
