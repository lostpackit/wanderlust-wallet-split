
-- Drop the conflicting old UPDATE policy that's causing the RLS violation
DROP POLICY IF EXISTS "Users can update participants they created" ON public.participants;

-- Also drop any other old policies that might be conflicting
DROP POLICY IF EXISTS "Users can create participants" ON public.participants;
DROP POLICY IF EXISTS "Users can update participants in their trips" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;

-- Recreate only the policies we need with clear names
CREATE POLICY "authenticated_users_can_create_participants" ON public.participants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "users_can_view_trip_participants" ON public.participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.participant_id = participants.id 
      AND public.is_user_trip_member(tp.trip_id, auth.uid())
    )
  );

CREATE POLICY "users_can_update_trip_participants" ON public.participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.participant_id = participants.id 
      AND public.is_user_trip_member(tp.trip_id, auth.uid())
    )
  );
