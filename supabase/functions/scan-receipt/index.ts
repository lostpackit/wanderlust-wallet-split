import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OCR Service Interface - makes it easy to swap providers
interface OCRProvider {
  extractText(imageData: string): Promise<string>;
}

// OCR.space implementation
class OCRSpaceProvider implements OCRProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractText(imageData: string): Promise<string> {
    console.log('OCR.space: Starting text extraction');
    
    const formData = new FormData();
    formData.append('base64Image', imageData);
    formData.append('language', 'eng');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR.space API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('OCR.space response:', result);

    if (!result.IsErroredOnProcessing && result.ParsedResults?.length > 0) {
      return result.ParsedResults[0].ParsedText;
    } else {
      throw new Error(result.ErrorMessage || 'Failed to extract text from image');
    }
  }
}

// Receipt data parser
interface ReceiptData {
  vendor: string;
  amount: number;
  currency: string;
  date: string;
  rawText: string;
}

class ReceiptParser {
  static parse(text: string): ReceiptData {
    console.log('Parsing receipt text:', text);
    
    // Extract amount and currency
    const amountMatches = text.match(/(\$|€|£|¥|USD|EUR|GBP|JPY)?\s*(\d+[.,]\d{2})/gi) || [];
    let amount = 0;
    let currency = 'USD';
    
    if (amountMatches.length > 0) {
      const amountStr = amountMatches[0];
      const numberMatch = amountStr.match(/(\d+[.,]\d{2})/);
      if (numberMatch) {
        amount = parseFloat(numberMatch[1].replace(',', '.'));
      }
      
      // Extract currency
      if (amountStr.includes('$') || amountStr.includes('USD')) currency = 'USD';
      else if (amountStr.includes('€') || amountStr.includes('EUR')) currency = 'EUR';
      else if (amountStr.includes('£') || amountStr.includes('GBP')) currency = 'GBP';
      else if (amountStr.includes('¥') || amountStr.includes('JPY')) currency = 'JPY';
    }

    // Extract vendor (usually first few words or lines)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let vendor = 'Unknown Vendor';
    if (lines.length > 0) {
      vendor = lines[0].trim();
      // Clean up common receipt artifacts
      vendor = vendor.replace(/[*#@]+/g, '').trim();
      if (vendor.length > 50) {
        vendor = vendor.substring(0, 50) + '...';
      }
    }

    // Extract date (various formats)
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      /(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{2,4})/i
    ];
    
    let date = new Date().toISOString().split('T')[0]; // Default to today
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const dateStr = match[0];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
            break;
          }
        } catch (e) {
          console.log('Date parsing failed:', e);
        }
      }
    }

    return {
      vendor,
      amount,
      currency,
      date,
      rawText: text
    };
  }
}

// Currency converter
class CurrencyConverter {
  static async getExchangeRate(fromCurrency: string, toCurrency: string, date: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1.0;
    
    console.log(`Getting exchange rate: ${fromCurrency} to ${toCurrency} for ${date}`);
    
    try {
      // Using exchangerate-api.com (free tier: 1500 requests/month)
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
      
      if (!response.ok) {
        console.log('Exchange rate API failed, using fallback rate 1.0');
        return 1.0;
      }
      
      const data = await response.json();
      const rate = data.rates[toCurrency];
      
      if (!rate) {
        console.log(`No rate found for ${toCurrency}, using fallback rate 1.0`);
        return 1.0;
      }
      
      console.log(`Exchange rate: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
      return rate;
    } catch (error) {
      console.error('Currency conversion error:', error);
      return 1.0; // Fallback rate
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, baseCurrency = 'USD' } = await req.json();
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Starting receipt processing...');
    
    // Get OCR API key
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY');
    if (!ocrApiKey) {
      throw new Error('OCR_SPACE_API_KEY not configured');
    }

    // Initialize OCR provider (easily swappable)
    const ocrProvider = new OCRSpaceProvider(ocrApiKey);
    
    // Extract text from image
    const extractedText = await ocrProvider.extractText(imageData);
    console.log('Extracted text:', extractedText);
    
    // Parse receipt data
    const receiptData = ReceiptParser.parse(extractedText);
    console.log('Parsed receipt data:', receiptData);
    
    // Convert currency if needed
    let convertedAmount = receiptData.amount;
    let exchangeRate = 1.0;
    
    if (receiptData.currency !== baseCurrency) {
      exchangeRate = await CurrencyConverter.getExchangeRate(
        receiptData.currency, 
        baseCurrency, 
        receiptData.date
      );
      convertedAmount = receiptData.amount * exchangeRate;
    }

    // Return structured data for expense form
    const result = {
      success: true,
      data: {
        description: receiptData.vendor,
        amount: convertedAmount,
        originalAmount: receiptData.amount,
        originalCurrency: receiptData.currency,
        exchangeRate,
        date: receiptData.date,
        category: 'Other', // Default category
        expenseSource: 'scanned_receipt',
        receiptData: {
          vendor: receiptData.vendor,
          rawText: receiptData.rawText,
          extractedAmount: receiptData.amount,
          extractedCurrency: receiptData.currency,
          extractedDate: receiptData.date
        }
      }
    };

    console.log('Final result:', result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Receipt scanning error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process receipt' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});