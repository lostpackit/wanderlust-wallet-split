-- Add is_guest column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_guest boolean NOT NULL DEFAULT false;

-- Create helper function to check if user is a guest
CREATE OR REPLACE FUNCTION public.is_guest_user(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_guest FROM public.profiles WHERE id = user_uuid),
    false
  );
$$;

-- Drop the existing INSERT policy on expenses
DROP POLICY IF EXISTS "Authenticated users can create expenses for trips they have acc" ON public.expenses;

-- Create new INSERT policy that prevents guests from creating expenses
CREATE POLICY "Non-guest users can create expenses for accessible trips"
ON public.expenses
FOR INSERT
WITH CHECK (
  -- User must NOT be a guest
  NOT public.is_guest_user(auth.uid())
  AND
  -- User must have access to the trip
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = expenses.trip_id 
    AND (
      t.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM trip_participants tp
        JOIN participants p ON tp.participant_id = p.id
        WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
      )
    )
  )
);