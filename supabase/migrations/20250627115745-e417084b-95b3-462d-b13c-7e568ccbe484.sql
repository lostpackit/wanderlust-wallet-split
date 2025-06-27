
-- Add shares column to trip_participants table
ALTER TABLE public.trip_participants 
ADD COLUMN shares integer NOT NULL DEFAULT 1;

-- Add a check constraint to ensure shares is always positive
ALTER TABLE public.trip_participants 
ADD CONSTRAINT trip_participants_shares_positive CHECK (shares > 0);
