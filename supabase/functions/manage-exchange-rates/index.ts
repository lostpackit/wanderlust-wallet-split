import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported currencies (matching the UI)
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

// Authentication helper
async function authenticateRequest(req: Request): Promise<{ user: any; error: Response | null }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  return { user: data.user, error: null };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) {
      console.log('Authentication failed for manage-exchange-rates request');
      return authError;
    }
    
    console.log(`Authenticated user ${user.id} making manage-exchange-rates request`);

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();
    
    console.log('Exchange rate management request:', { action, userId: user.id });

    if (action === 'cleanup') {
      // Remove rates older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { error: cleanupError, count } = await supabase
        .from('exchange_rates')
        .delete()
        .lt('date', ninetyDaysAgo.toISOString().split('T')[0]);

      if (cleanupError) {
        throw new Error(`Cleanup failed: ${cleanupError.message}`);
      }

      console.log(`Cleaned up ${count} old exchange rates`);
      
      return new Response(JSON.stringify({
        success: true,
        message: `Cleaned up ${count} old exchange rates`,
        cleanedCount: count
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'populate') {
      // Populate exchange rates for all currency pairs for today
      const today = new Date().toISOString().split('T')[0];
      const results = [];
      
      for (const baseCurrency of SUPPORTED_CURRENCIES) {
        try {
          const response = await fetch(`https://api.exchangerate-api.io/v4/latest/${baseCurrency}`);
          
          if (!response.ok) {
            console.warn(`Failed to fetch rates for ${baseCurrency}: ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          for (const targetCurrency of SUPPORTED_CURRENCIES) {
            if (baseCurrency === targetCurrency) continue;
            
            if (data.rates && data.rates[targetCurrency]) {
              const rate = data.rates[targetCurrency];
              
              // Upsert the rate
              const { error: upsertError } = await supabase
                .from('exchange_rates')
                .upsert({
                  base_currency: baseCurrency,
                  target_currency: targetCurrency,
                  rate: rate,
                  date: today
                });

              if (upsertError) {
                console.warn(`Failed to upsert rate ${baseCurrency}->${targetCurrency}:`, upsertError);
              } else {
                results.push(`${baseCurrency}->${targetCurrency}: ${rate}`);
              }
            }
          }
          
          // Add small delay to avoid hitting API rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing ${baseCurrency}:`, error);
        }
      }

      console.log(`Populated ${results.length} exchange rates for ${today}`);
      
      return new Response(JSON.stringify({
        success: true,
        message: `Populated ${results.length} exchange rates`,
        populatedCount: results.length,
        date: today
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'validate') {
      // Validate existing rates for obvious errors
      const { data: rates, error: fetchError } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      if (fetchError) {
        throw new Error(`Failed to fetch rates: ${fetchError.message}`);
      }

      const issues = [];
      
      for (const rate of rates || []) {
        // Check for obviously wrong rates
        if (rate.rate <= 0) {
          issues.push(`Invalid rate: ${rate.base_currency}->${rate.target_currency} = ${rate.rate} on ${rate.date}`);
        }
        
        // Check for JPY rates that should be much higher than 1
        if (rate.target_currency === 'JPY' && rate.rate < 50) {
          issues.push(`Suspicious JPY rate: ${rate.base_currency}->JPY = ${rate.rate} on ${rate.date} (expected >50)`);
        }
        
        // Check for rates that seem too high
        if (rate.rate > 1000 && rate.target_currency !== 'JPY') {
          issues.push(`Suspicious high rate: ${rate.base_currency}->${rate.target_currency} = ${rate.rate} on ${rate.date}`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Validated ${rates?.length || 0} rates`,
        issues: issues,
        issueCount: issues.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action. Use: cleanup, populate, or validate'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in manage-exchange-rates function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
