-- Fix notification impersonation vulnerability
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Allow inserting notifications" ON public.notifications;

-- Create a new policy that only allows service role to insert notifications
-- This ensures notifications can only be created by trusted server-side code (Edge Functions)
CREATE POLICY "Only service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.role() = 'service_role');