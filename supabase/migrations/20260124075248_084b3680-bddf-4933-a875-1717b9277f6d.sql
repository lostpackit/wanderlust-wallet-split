-- Create a helper function to get participant IDs for a user (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_user_participant_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.participants WHERE user_id = user_uuid;
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;

-- Create policy using the helper function to avoid recursion
CREATE POLICY "Users can view participants in their trips"
  ON public.participants
  FOR SELECT
  USING (
    -- User is this participant
    user_id = auth.uid()
    -- OR participant is in a trip the user created
    OR EXISTS (
      SELECT 1 FROM public.trip_participants tp
      INNER JOIN public.trips t ON t.id = tp.trip_id
      WHERE tp.participant_id = participants.id
      AND t.created_by = auth.uid()
    )
    -- OR participant shares a trip with the user (using helper function to avoid recursion)
    OR EXISTS (
      SELECT 1 FROM public.trip_participants tp1
      WHERE tp1.participant_id = participants.id
      AND tp1.trip_id IN (
        SELECT tp2.trip_id FROM public.trip_participants tp2
        WHERE tp2.participant_id IN (SELECT public.get_user_participant_ids(auth.uid()))
      )
    )
  );