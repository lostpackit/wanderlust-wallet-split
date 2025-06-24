
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view trips they created or participate in" ON public.trips;
DROP POLICY IF EXISTS "Users can create trips" ON public.trips;
DROP POLICY IF EXISTS "Trip creators can update their trips" ON public.trips;
DROP POLICY IF EXISTS "Trip creators can delete their trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they are part of" ON public.trips;

DROP POLICY IF EXISTS "Users can view participants in their trips" ON public.participants;
DROP POLICY IF EXISTS "Users can create participants" ON public.participants;
DROP POLICY IF EXISTS "Users can update participants they created" ON public.participants;

DROP POLICY IF EXISTS "Users can view trip participants for their trips" ON public.trip_participants;
DROP POLICY IF EXISTS "Trip creators can manage trip participants" ON public.trip_participants;

DROP POLICY IF EXISTS "Users can view expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their trips" ON public.expenses;

-- Add proper foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_trip_participants_trip'
    ) THEN
        ALTER TABLE public.trip_participants 
        ADD CONSTRAINT fk_trip_participants_trip 
        FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_trip_participants_participant'
    ) THEN
        ALTER TABLE public.trip_participants 
        ADD CONSTRAINT fk_trip_participants_participant 
        FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_expenses_trip'
    ) THEN
        ALTER TABLE public.expenses 
        ADD CONSTRAINT fk_expenses_trip 
        FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_expenses_paid_by'
    ) THEN
        ALTER TABLE public.expenses 
        ADD CONSTRAINT fk_expenses_paid_by 
        FOREIGN KEY (paid_by) REFERENCES public.participants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Now create all the RLS policies
CREATE POLICY "Users can view trips they created or participate in" ON public.trips
  FOR SELECT USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM public.trip_participants tp 
      JOIN public.participants p ON tp.participant_id = p.id 
      WHERE tp.trip_id = trips.id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Trip creators can update their trips" ON public.trips
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Trip creators can delete their trips" ON public.trips
  FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Users can view participants in their trips" ON public.participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants tp
      JOIN public.trips t ON tp.trip_id = t.id
      WHERE tp.participant_id = participants.id AND (
        t.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.trip_participants tp2
          JOIN public.participants p2 ON tp2.participant_id = p2.id
          WHERE tp2.trip_id = t.id AND p2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create participants" ON public.participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update participants they created" ON public.participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view trip participants for their trips" ON public.trip_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_participants.trip_id AND (
        t.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.participants p
          WHERE p.id = trip_participants.participant_id AND p.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Trip creators can manage trip participants" ON public.trip_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_participants.trip_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view expenses for their trips" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = expenses.trip_id AND (
        t.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.trip_participants tp
          JOIN public.participants p ON tp.participant_id = p.id
          WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create expenses for their trips" ON public.expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = expenses.trip_id AND (
        t.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.trip_participants tp
          JOIN public.participants p ON tp.participant_id = p.id
          WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update expenses for their trips" ON public.expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = expenses.trip_id AND (
        t.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.trip_participants tp
          JOIN public.participants p ON tp.participant_id = p.id
          WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete expenses for their trips" ON public.expenses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = expenses.trip_id AND (
        t.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.trip_participants tp
          JOIN public.participants p ON tp.participant_id = p.id
          WHERE tp.trip_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

-- Add indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON public.trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_participant_id ON public.trip_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.participants(user_id);
