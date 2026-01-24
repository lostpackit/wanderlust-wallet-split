-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;

-- Create a simpler, non-recursive policy
-- Option 1: Allow viewing participants if you're logged in and either:
-- - You ARE that participant (user_id matches)
-- - OR you can be verified as a trip member via a direct lookup
CREATE POLICY "Users can view participants in their trips"
  ON public.participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.participant_id = participants.id
      AND EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.id = tp.trip_id
        AND (
          t.created_by = auth.uid()
          OR t.id IN (
            SELECT tp2.trip_id FROM public.trip_participants tp2
            JOIN public.participants p2 ON tp2.participant_id = p2.id
            WHERE p2.user_id = auth.uid()
          )
        )
      )
    )
  );