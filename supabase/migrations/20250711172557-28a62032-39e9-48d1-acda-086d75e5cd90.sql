-- Fix the RLS policies for expenses table by simplifying and ensuring proper auth context

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Users can create expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their trips" ON public.expenses;

-- Create new, simplified policies that should work better
CREATE POLICY "Authenticated users can create expenses for trips they have access to" 
ON public.expenses FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id 
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_participants tp
        JOIN public.participants p ON tp.participant_id = p.id
        WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view expenses for accessible trips" 
ON public.expenses FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id 
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_participants tp
        JOIN public.participants p ON tp.participant_id = p.id
        WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update expenses for accessible trips" 
ON public.expenses FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id 
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_participants tp
        JOIN public.participants p ON tp.participant_id = p.id
        WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete expenses for accessible trips" 
ON public.expenses FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id 
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_participants tp
        JOIN public.participants p ON tp.participant_id = p.id
        WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
      )
    )
  )
);