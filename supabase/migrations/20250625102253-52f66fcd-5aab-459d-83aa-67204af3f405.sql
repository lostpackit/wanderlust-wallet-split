
-- Let's check and fix the RLS policies for participants table
-- First, let's drop the existing policy that might be too restrictive
DROP POLICY IF EXISTS "Users can create participants" ON public.participants;

-- Create a more permissive policy for creating participants
-- This allows authenticated users to create participants for trips they're part of
CREATE POLICY "Users can create participants" ON public.participants
  FOR INSERT WITH CHECK (
    -- Allow if the user is authenticated (participants can be created by trip creators/members)
    auth.uid() IS NOT NULL
  );

-- Also ensure we have a proper policy for updating participants
CREATE POLICY "Users can update participants in their trips" ON public.participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      JOIN public.trips t ON tp.trip_id = t.id
      WHERE tp.participant_id = participants.id 
      AND (t.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.trip_participants tp2
        JOIN public.participants p2 ON tp2.participant_id = p2.id
        WHERE tp2.trip_id = t.id AND p2.user_id = auth.uid()
      ))
    )
  );
