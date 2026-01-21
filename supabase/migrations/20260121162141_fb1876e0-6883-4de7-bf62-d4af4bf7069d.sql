-- SECURITY FIX: Remove temporary debug policy that bypasses RLS on expenses
DROP POLICY IF EXISTS "Temporary debug policy for expenses" ON public.expenses;

-- Remove debug function that leaks JWT information
DROP FUNCTION IF EXISTS public.debug_auth_context();

-- SECURITY FIX: Replace overly permissive participants policies with proper scoped policies

-- Drop existing permissive policies
DROP POLICY IF EXISTS "authenticated_users_can_select_participants" ON public.participants;
DROP POLICY IF EXISTS "authenticated_users_can_insert_participants" ON public.participants;
DROP POLICY IF EXISTS "authenticated_users_can_update_participants" ON public.participants;

-- Create scoped SELECT policy: Users can only see participants from trips they are members of
CREATE POLICY "Users can view participants in their trips" 
ON public.participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_participants tp
    JOIN trips t ON tp.trip_id = t.id
    WHERE tp.participant_id = participants.id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM trip_participants tp2
        JOIN participants p2 ON tp2.participant_id = p2.id
        WHERE tp2.trip_id = t.id AND p2.user_id = auth.uid()
      )
    )
  )
  -- Also allow users to see their own participant record
  OR user_id = auth.uid()
);

-- Create scoped INSERT policy: Only authenticated users can create participants
-- The actual trip association is controlled by trip_participants table policies
CREATE POLICY "Authenticated users can create participants" 
ON public.participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create scoped UPDATE policy: Users can only update their own participant records
CREATE POLICY "Users can update their own participant records" 
ON public.participants FOR UPDATE
USING (user_id = auth.uid());