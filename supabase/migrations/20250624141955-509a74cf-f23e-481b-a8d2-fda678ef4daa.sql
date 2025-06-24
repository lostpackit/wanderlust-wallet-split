
-- First, let's drop the problematic policies
DROP POLICY IF EXISTS "Users can view trip participants for their trips" ON public.trip_participants;
DROP POLICY IF EXISTS "Trip creators can manage trip participants" ON public.trip_participants;

-- Create a security definer function to check if user is trip creator or participant
CREATE OR REPLACE FUNCTION public.is_user_trip_member(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_uuid AND t.created_by = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM public.trip_participants tp
    JOIN public.participants p ON tp.participant_id = p.id
    WHERE tp.trip_id = trip_uuid AND p.user_id = user_uuid
  );
$$;

-- Create new policies using the security definer function
CREATE POLICY "Users can view trip participants for their trips" ON public.trip_participants
  FOR SELECT USING (
    public.is_user_trip_member(trip_id, auth.uid())
  );

CREATE POLICY "Trip creators and participants can manage trip participants" ON public.trip_participants
  FOR ALL USING (
    public.is_user_trip_member(trip_id, auth.uid())
  );

-- Also fix the participants table policies that might have similar issues
DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;

CREATE POLICY "Users can view participants in their trips" ON public.participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      WHERE tp.participant_id = participants.id 
      AND public.is_user_trip_member(tp.trip_id, auth.uid())
    )
  );
