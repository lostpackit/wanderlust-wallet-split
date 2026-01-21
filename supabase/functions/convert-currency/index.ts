import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.log('Authentication failed for convert-currency request');
      return authError;
    }
    
    console.log(`Authenticated user ${user.id} making convert-currency request`);

    // Initialize Supabase client with service role for database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { fromCurrency, toCurrency, amount, date } = await req.json();
    
    console.log('Currency conversion request:', { fromCurrency, toCurrency, amount, date });

    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      return new Response(JSON.stringify({
        originalAmount: amount,
        convertedAmount: amount,
        exchangeRate: 1,
        fromCurrency,
        toCurrency,
        date
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiDate = date || new Date().toISOString().split('T')[0];
    const requestDate = new Date(apiDate);
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
    
    // If date is older than 90 days, use current date
    const effectiveDate = requestDate < ninetyDaysAgo ? today.toISOString().split('T')[0] : apiDate;
    
    let exchangeRate = 1;
    let convertedAmount = amount;

    try {
      // First, check cache for the rate
      const { data: cachedRate, error: cacheError } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('base_currency', fromCurrency)
        .eq('target_currency', toCurrency)
        .eq('date', effectiveDate)
        .single();

      if (cachedRate && !cacheError) {
        exchangeRate = Number(cachedRate.rate);
        convertedAmount = amount * exchangeRate;
        console.log('Using cached exchange rate:', { exchangeRate, convertedAmount, date: effectiveDate });
      } else {
        // Fetch from API and cache the result
        const response = await fetch(`https://api.exchangerate-api.io/v4/latest/${fromCurrency}`);
        
        if (!response.ok) {
          throw new Error(`Exchange rate API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.rates && data.rates[toCurrency]) {
          exchangeRate = data.rates[toCurrency];
          convertedAmount = amount * exchangeRate;
          
          // Cache the rate for future use
          const { error: insertError } = await supabase
            .from('exchange_rates')
            .upsert({
              base_currency: fromCurrency,
              target_currency: toCurrency,
              rate: exchangeRate,
              date: effectiveDate
            });

          if (insertError) {
            console.warn('Failed to cache exchange rate:', insertError);
          }
          
          console.log('Fetched and cached new exchange rate:', { exchangeRate, convertedAmount, date: effectiveDate });
        } else {
          throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
        }
      }
    } catch (apiError) {
      console.error('Error getting exchange rate:', apiError);
      
      // Enhanced fallback with more accurate rates
      const fallbackRates: { [key: string]: { [key: string]: number } } = {
        'USD': { 'EUR': 0.92, 'GBP': 0.79, 'CAD': 1.36, 'AUD': 1.52, 'JPY': 149.50, 'CHF': 0.88, 'CNY': 7.24 },
        'EUR': { 'USD': 1.09, 'GBP': 0.86, 'CAD': 1.48, 'AUD': 1.65, 'JPY': 162.80, 'CHF': 0.96, 'CNY': 7.88 },
        'GBP': { 'USD': 1.27, 'EUR': 1.16, 'CAD': 1.72, 'AUD': 1.92, 'JPY': 189.40, 'CHF': 1.12, 'CNY': 9.17 },
        'JPY': { 'USD': 0.0067, 'EUR': 0.0061, 'GBP': 0.0053, 'CAD': 0.0091, 'AUD': 0.0102, 'CHF': 0.0059, 'CNY': 0.048 },
        'CAD': { 'USD': 0.74, 'EUR': 0.68, 'GBP': 0.58, 'AUD': 1.12, 'JPY': 110.07, 'CHF': 0.65, 'CNY': 5.33 },
        'AUD': { 'USD': 0.66, 'EUR': 0.61, 'GBP': 0.52, 'CAD': 0.89, 'JPY': 98.36, 'CHF': 0.58, 'CNY': 4.76 },
        'CHF': { 'USD': 1.14, 'EUR': 1.04, 'GBP': 0.89, 'CAD': 1.54, 'AUD': 1.72, 'JPY': 170.45, 'CNY': 8.25 },
        'CNY': { 'USD': 0.14, 'EUR': 0.13, 'GBP': 0.11, 'CAD': 0.19, 'AUD': 0.21, 'JPY': 20.65, 'CHF': 0.12 }
      };
      
      if (fallbackRates[fromCurrency] && fallbackRates[fromCurrency][toCurrency]) {
        exchangeRate = fallbackRates[fromCurrency][toCurrency];
        convertedAmount = amount * exchangeRate;
        console.log('Using enhanced fallback exchange rate:', { exchangeRate, convertedAmount, source: 'fallback' });
      } else {
        console.warn(`No fallback rate available for ${fromCurrency} to ${toCurrency}, using 1:1`);
      }
    }

    return new Response(JSON.stringify({
      originalAmount: amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      exchangeRate: Math.round(exchangeRate * 10000) / 10000, // Round to 4 decimal places
      fromCurrency,
      toCurrency,
      date: apiDate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in convert-currency function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      originalAmount: 0,
      convertedAmount: 0,
      exchangeRate: 1
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
