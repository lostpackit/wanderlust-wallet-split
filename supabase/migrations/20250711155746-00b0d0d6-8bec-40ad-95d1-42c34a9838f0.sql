-- Add additional_amount column to trip_participants table
ALTER TABLE public.trip_participants 
ADD COLUMN additional_amount numeric DEFAULT 0 NOT NULL;