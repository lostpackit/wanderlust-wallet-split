import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token to verify authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse the request body
    const { userId, title, message, type = 'trip_invitation', data = {} }: NotificationRequest = await req.json();

    // Validate required fields
    if (!userId || !title || !message) {
      console.error('Missing required fields:', { userId: !!userId, title: !!title, message: !!message });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that the requesting user has permission to send this notification
    // They must be either:
    // 1. The creator of a trip mentioned in data.trip_id
    // 2. A participant in a trip mentioned in data.trip_id
    // 3. The user themselves (for system notifications)
    
    const tripId = data?.trip_id as string | undefined;
    
    if (tripId) {
      // Verify user has access to this trip
      const { data: tripAccess, error: tripError } = await userSupabase
        .rpc('is_user_trip_member', { trip_uuid: tripId, user_uuid: user.id });
      
      if (tripError) {
        console.error('Error checking trip membership:', tripError.message);
        return new Response(
          JSON.stringify({ error: 'Failed to verify trip access' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!tripAccess) {
        console.error('User does not have access to trip:', tripId);
        return new Response(
          JSON.stringify({ error: 'You do not have permission to send notifications for this trip' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('User has access to trip:', tripId);
    } else if (userId !== user.id) {
      // If no trip_id and trying to notify someone else, deny
      console.error('Cannot send notification to another user without trip context');
      return new Response(
        JSON.stringify({ error: 'Cannot send notification to another user without trip context' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to insert the notification (bypasses RLS)
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await adminSupabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        data
      });

    if (insertError) {
      console.error('Failed to create notification:', insertError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to create notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Notification created successfully for user:', userId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
