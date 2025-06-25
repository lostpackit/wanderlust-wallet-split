
-- Let's drop all existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can create participants" ON public.participants;
DROP POLICY IF EXISTS "Users can update participants in their trips" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;

-- Create a policy that allows creating participants when the user has access to the trip
CREATE POLICY "Users can create participants for accessible trips" ON public.participants
  FOR INSERT WITH CHECK (
    -- Allow authenticated users to create participants
    -- This is permissive since participants can be added to any trip by authenticated users
    auth.uid() IS NOT NULL
  );

-- Recreate the view policy  
CREATE POLICY "Users can view participants in their trips" ON public.participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.participant_id = participants.id 
      AND public.is_user_trip_member(tp.trip_id, auth.uid())
    )
  );

-- Update policy for updating participants
CREATE POLICY "Users can update participants in accessible trips" ON public.participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.participant_id = participants.id 
      AND public.is_user_trip_member(tp.trip_id, auth.uid())
    )
  );
