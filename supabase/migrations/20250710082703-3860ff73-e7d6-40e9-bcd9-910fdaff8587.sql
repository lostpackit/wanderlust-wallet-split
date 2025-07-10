-- Update existing participants to link them to user accounts based on email matching
UPDATE participants 
SET user_id = profiles.id
FROM profiles 
WHERE participants.email = profiles.email 
  AND participants.user_id IS NULL;

-- Create a function to automatically link participants when users sign up
CREATE OR REPLACE FUNCTION public.link_participant_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Update any existing participants with matching email to link to this new user
  UPDATE participants 
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically link participants when users sign up
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.link_participant_on_signup();