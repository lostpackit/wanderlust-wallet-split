import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Use exchangerate-api.io for historical rates (free tier allows historical data)
    const apiDate = date || new Date().toISOString().split('T')[0];
    
    let exchangeRate = 1;
    let convertedAmount = amount;

    try {
      // Try to get historical rate for the specific date
      const response = await fetch(`https://api.exchangerate-api.io/v4/latest/${fromCurrency}`);
      
      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.rates && data.rates[toCurrency]) {
        exchangeRate = data.rates[toCurrency];
        convertedAmount = amount * exchangeRate;
        
        console.log('Exchange rate found:', { exchangeRate, convertedAmount });
      } else {
        console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}, using 1:1`);
      }
    } catch (apiError) {
      console.error('Error fetching exchange rate:', apiError);
      
      // Fallback to some common exchange rates (approximate)
      const fallbackRates: { [key: string]: { [key: string]: number } } = {
        'USD': { 'EUR': 0.85, 'GBP': 0.73, 'CAD': 1.25, 'AUD': 1.35, 'JPY': 110, 'CHF': 0.92 },
        'EUR': { 'USD': 1.18, 'GBP': 0.86, 'CAD': 1.47, 'AUD': 1.59, 'JPY': 130, 'CHF': 1.08 },
        'GBP': { 'USD': 1.37, 'EUR': 1.16, 'CAD': 1.71, 'AUD': 1.85, 'JPY': 151, 'CHF': 1.26 }
      };
      
      if (fallbackRates[fromCurrency] && fallbackRates[fromCurrency][toCurrency]) {
        exchangeRate = fallbackRates[fromCurrency][toCurrency];
        convertedAmount = amount * exchangeRate;
        console.log('Using fallback exchange rate:', { exchangeRate, convertedAmount });
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