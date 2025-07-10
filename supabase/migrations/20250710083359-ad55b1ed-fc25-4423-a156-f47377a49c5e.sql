-- Fix search_path security vulnerability in all functions

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
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
$function$;

-- Update is_user_trip_member function
CREATE OR REPLACE FUNCTION public.is_user_trip_member(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_uuid AND t.created_by = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM public.trip_participants tp
    JOIN public.participants p ON tp.participant_id = p.id
    WHERE tp.trip_id = trip_uuid AND p.user_id = user_uuid
  );
$function$;

-- Update update_payments_updated_at function
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update link_participant_on_signup function
CREATE OR REPLACE FUNCTION public.link_participant_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Update any existing participants with matching email to link to this new user
  UPDATE public.participants 
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$function$;