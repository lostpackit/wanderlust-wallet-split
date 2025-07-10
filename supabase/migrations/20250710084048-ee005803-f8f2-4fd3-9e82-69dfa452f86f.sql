-- RLS Performance Optimization: Fix auth.uid() re-evaluation and remove duplicate policies

-- 1. Drop and recreate all policies with optimized auth.uid() calls

-- EXPENSES TABLE POLICIES
DROP POLICY IF EXISTS "Users can create expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expenses for their trips" ON public.expenses;

CREATE POLICY "Users can create expenses for their trips" ON public.expenses
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = expenses.trip_id 
    AND (t.created_by = (select auth.uid()) OR EXISTS (
      SELECT 1 FROM trip_participants tp
      JOIN participants p ON tp.participant_id = p.id
      WHERE tp.trip_id = t.id AND p.user_id = (select auth.uid())
    ))
  )
);

CREATE POLICY "Users can delete expenses for their trips" ON public.expenses
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = expenses.trip_id 
    AND (t.created_by = (select auth.uid()) OR EXISTS (
      SELECT 1 FROM trip_participants tp
      JOIN participants p ON tp.participant_id = p.id
      WHERE tp.trip_id = t.id AND p.user_id = (select auth.uid())
    ))
  )
);

CREATE POLICY "Users can update expenses for their trips" ON public.expenses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = expenses.trip_id 
    AND (t.created_by = (select auth.uid()) OR EXISTS (
      SELECT 1 FROM trip_participants tp
      JOIN participants p ON tp.participant_id = p.id
      WHERE tp.trip_id = t.id AND p.user_id = (select auth.uid())
    ))
  )
);

CREATE POLICY "Users can view expenses for their trips" ON public.expenses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = expenses.trip_id 
    AND (t.created_by = (select auth.uid()) OR EXISTS (
      SELECT 1 FROM trip_participants tp
      JOIN participants p ON tp.participant_id = p.id
      WHERE tp.trip_id = t.id AND p.user_id = (select auth.uid())
    ))
  )
);

-- PAYMENTS TABLE POLICIES
DROP POLICY IF EXISTS "Users can create payments they are involved in" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments they are involved in" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments they are involved in" ON public.payments;

CREATE POLICY "Users can create payments they are involved in" ON public.payments
FOR INSERT WITH CHECK ((select auth.uid()) = from_user_id OR (select auth.uid()) = to_user_id);

CREATE POLICY "Users can update payments they are involved in" ON public.payments
FOR UPDATE USING ((select auth.uid()) = from_user_id OR (select auth.uid()) = to_user_id);

CREATE POLICY "Users can view payments they are involved in" ON public.payments
FOR SELECT USING ((select auth.uid()) = from_user_id OR (select auth.uid()) = to_user_id);

-- PROFILES TABLE POLICIES
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = id);

-- NOTIFICATIONS TABLE POLICIES
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING ((select auth.uid()) = user_id);

-- TRIPS TABLE POLICIES
DROP POLICY IF EXISTS "Users can create trips" ON public.trips;
DROP POLICY IF EXISTS "Trip creators can delete their trips" ON public.trips;
DROP POLICY IF EXISTS "Trip creators can update their trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they created or participate in" ON public.trips;

CREATE POLICY "Users can create trips" ON public.trips
FOR INSERT WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Trip creators can delete their trips" ON public.trips
FOR DELETE USING ((select auth.uid()) = created_by);

CREATE POLICY "Trip creators can update their trips" ON public.trips
FOR UPDATE USING ((select auth.uid()) = created_by);

CREATE POLICY "Users can view trips they created or participate in" ON public.trips
FOR SELECT USING (
  (select auth.uid()) = created_by OR EXISTS (
    SELECT 1 FROM trip_participants tp
    JOIN participants p ON tp.participant_id = p.id
    WHERE tp.trip_id = trips.id AND p.user_id = (select auth.uid())
  )
);

-- TRIP_PARTICIPANTS TABLE POLICIES
-- Remove duplicate policy and update the remaining one
DROP POLICY IF EXISTS "Trip creators and participants can manage trip participants" ON public.trip_participants;
DROP POLICY IF EXISTS "Users can view trip participants for their trips" ON public.trip_participants;

-- Create single optimized policy that covers all operations
CREATE POLICY "Trip creators and participants can manage trip participants" ON public.trip_participants
FOR ALL USING (is_user_trip_member(trip_id, (select auth.uid())));

-- Update the is_user_trip_member function calls to also use optimized auth.uid()
-- Note: The function itself is already optimized but we ensure consistency