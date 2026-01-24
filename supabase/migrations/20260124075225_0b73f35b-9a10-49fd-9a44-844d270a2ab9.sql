-- Drop the still-recursive policy
DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;

-- Create a simpler policy that avoids the recursion
-- Users can view participants if:
-- 1. They ARE that participant (their user_id)
-- 2. OR the participant is in a trip they created
-- 3. OR the participant is in a trip where the user is also a linked participant
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
    -- OR participant is in a trip where user is a linked participant (check via user_id only, no self-join on participants)
    OR EXISTS (
      SELECT 1 FROM public.trip_participants tp1
      WHERE tp1.participant_id = participants.id
      AND tp1.trip_id IN (
        SELECT tp2.trip_id FROM public.trip_participants tp2
        WHERE tp2.participant_id IN (
          SELECT p.id FROM public.participants p WHERE p.user_id = auth.uid()
        )
      )
    )
  );