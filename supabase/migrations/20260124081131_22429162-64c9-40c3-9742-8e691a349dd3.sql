-- Fix RLS infinite recursion by using security definer functions instead of cross-table self-references

-- 1) Participants visibility helper (breaks circular dependency participants <-> trips)
CREATE OR REPLACE FUNCTION public.can_view_participant(participant_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.participants p
      WHERE p.id = participant_uuid
        AND p.user_id = user_uuid
    )
    OR EXISTS (
      SELECT 1
      FROM public.trip_participants tp
      WHERE tp.participant_id = participant_uuid
        AND public.is_user_trip_member(tp.trip_id, user_uuid)
    );
$$;

-- 2) Trips policy: use is_user_trip_member (security definer) to avoid recursion
DROP POLICY IF EXISTS "Users can view trips they created or participate in" ON public.trips;
CREATE POLICY "Users can view trips they created or participate in"
  ON public.trips
  FOR SELECT
  USING (public.is_user_trip_member(id, auth.uid()));

-- 3) Participants SELECT policy: use helper function
DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;
CREATE POLICY "Users can view participants in their trips"
  ON public.participants
  FOR SELECT
  USING (public.can_view_participant(id, auth.uid()));

-- 4) Expenses policies: use is_user_trip_member to avoid recursion through trips/participants
DROP POLICY IF EXISTS "Users can view expenses for accessible trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses for accessible trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses for accessible trips" ON public.expenses;
DROP POLICY IF EXISTS "Non-guest users can create expenses for accessible trips" ON public.expenses;

CREATE POLICY "Users can view expenses for accessible trips"
  ON public.expenses
  FOR SELECT
  USING (public.is_user_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can update expenses for accessible trips"
  ON public.expenses
  FOR UPDATE
  USING (public.is_user_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can delete expenses for accessible trips"
  ON public.expenses
  FOR DELETE
  USING (public.is_user_trip_member(trip_id, auth.uid()));

CREATE POLICY "Non-guest users can create expenses for accessible trips"
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    (NOT public.is_guest_user(auth.uid()))
    AND public.is_user_trip_member(trip_id, auth.uid())
  );
