
-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  settlement_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip_participants table (many-to-many relationship)
CREATE TABLE public.trip_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('admin', 'participant')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, participant_id)
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_by UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  split_between UUID[] NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  receipt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trips
CREATE POLICY "Users can view trips they are part of" ON public.trips
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

-- Create RLS policies for participants
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

-- Create RLS policies for trip_participants
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

-- Create RLS policies for expenses
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

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
