-- Add IBAN column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN iban TEXT;