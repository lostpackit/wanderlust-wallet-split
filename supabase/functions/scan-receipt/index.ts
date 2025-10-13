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
  category: string;
  rawText: string;
}

class ReceiptParser {
  static parse(text: string): ReceiptData {
    console.log('Parsing receipt text:', text);
    
    // Extract amount and currency - look for total first
    let amount = 0;
    let currency = 'USD';
    
    // Look for total amount patterns first (more reliable)
    const totalPatterns = [
      /(?:total|amount\s+due|grand\s+total|final\s+total|sum)\s*:?\s*(\$|€|£|¥|USD|EUR|GBP|JPY)?\s*(\d+[.,]\d{2})/gi,
      /(\$|€|£|¥|USD|EUR|GBP|JPY)\s*(\d+[.,]\d{2})\s*(?:total|amount\s+due|grand\s+total)/gi
    ];
    
    let foundTotal = false;
    for (const pattern of totalPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const totalMatch = matches[matches.length - 1]; // Take the last match (usually the final total)
        const numberMatch = totalMatch.match(/(\d+[.,]\d{2})/);
        if (numberMatch) {
          amount = parseFloat(numberMatch[1].replace(',', '.'));
          foundTotal = true;
          
          // Extract currency from total line
          if (totalMatch.includes('$') || totalMatch.includes('USD')) currency = 'USD';
          else if (totalMatch.includes('€') || totalMatch.includes('EUR')) currency = 'EUR';
          else if (totalMatch.includes('£') || totalMatch.includes('GBP')) currency = 'GBP';
          else if (totalMatch.includes('¥') || totalMatch.includes('JPY')) currency = 'JPY';
          break;
        }
      }
    }
    
    // Fallback to general amount detection if no total found
    if (!foundTotal) {
      const amountMatches = text.match(/(\$|€|£|¥|USD|EUR|GBP|JPY)?\s*(\d+[.,]\d{2})/gi) || [];
      if (amountMatches.length > 0) {
        // Take the largest amount found (likely to be the total)
        let maxAmount = 0;
        let maxAmountStr = '';
        
        for (const amountStr of amountMatches) {
          const numberMatch = amountStr.match(/(\d+[.,]\d{2})/);
          if (numberMatch) {
            const currentAmount = parseFloat(numberMatch[1].replace(',', '.'));
            if (currentAmount > maxAmount) {
              maxAmount = currentAmount;
              maxAmountStr = amountStr;
            }
          }
        }
        
        if (maxAmount > 0) {
          amount = maxAmount;
          // Extract currency
          if (maxAmountStr.includes('$') || maxAmountStr.includes('USD')) currency = 'USD';
          else if (maxAmountStr.includes('€') || maxAmountStr.includes('EUR')) currency = 'EUR';
          else if (maxAmountStr.includes('£') || maxAmountStr.includes('GBP')) currency = 'GBP';
          else if (maxAmountStr.includes('¥') || maxAmountStr.includes('JPY')) currency = 'JPY';
        }
      }
    }

    // Extract vendor name - look for business names and clean up
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let vendor = 'Unknown Vendor';
    
    if (lines.length > 0) {
      // Look for the most likely vendor name in first few lines
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim();
        
        // Skip common receipt headers/artifacts
        if (line.match(/^\d+$/) || // Just numbers
            line.match(/^[\*#@\-=\s]+$/) || // Just symbols
            line.toLowerCase().includes('receipt') ||
            line.toLowerCase().includes('invoice') ||
            line.toLowerCase().includes('order') ||
            line.length < 3) {
          continue;
        }
        
        // Clean up the line
        let cleanLine = line
          .replace(/[*#@]+/g, '') // Remove symbols
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();
        
        if (cleanLine.length >= 3 && cleanLine.length <= 50) {
          vendor = cleanLine;
          break;
        }
      }
      
      // If vendor is still unknown, take the first substantial line
      if (vendor === 'Unknown Vendor' && lines[0]) {
        vendor = lines[0]
          .replace(/[*#@]+/g, '')
          .trim()
          .substring(0, 50);
      }
    }

    // Intelligent category detection
    const category = ReceiptParser.detectCategory(vendor, text);

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
      category,
      rawText: text
    };
  }

  static detectCategory(vendor: string, text: string): string {
    const vendorLower = vendor.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Restaurant/Food categories
    if (vendorLower.includes('restaurant') || vendorLower.includes('cafe') || 
        vendorLower.includes('pizza') || vendorLower.includes('burger') ||
        vendorLower.includes('kitchen') || vendorLower.includes('grill') ||
        vendorLower.includes('diner') || vendorLower.includes('bistro') ||
        vendorLower.includes('mcdonald') || vendorLower.includes('subway') ||
        vendorLower.includes('starbucks') || vendorLower.includes('dunkin') ||
        textLower.includes('food') || textLower.includes('meal') ||
        textLower.includes('drink') || textLower.includes('beverage')) {
      return 'Food & Dining';
    }
    
    // Transportation
    if (vendorLower.includes('uber') || vendorLower.includes('lyft') ||
        vendorLower.includes('taxi') || vendorLower.includes('metro') ||
        vendorLower.includes('transit') || vendorLower.includes('airline') ||
        vendorLower.includes('airport') || vendorLower.includes('gas') ||
        vendorLower.includes('fuel') || vendorLower.includes('shell') ||
        vendorLower.includes('exxon') || vendorLower.includes('bp') ||
        textLower.includes('transportation') || textLower.includes('travel')) {
      return 'Transportation';
    }
    
    // Accommodation
    if (vendorLower.includes('hotel') || vendorLower.includes('motel') ||
        vendorLower.includes('inn') || vendorLower.includes('resort') ||
        vendorLower.includes('airbnb') || vendorLower.includes('hostel') ||
        textLower.includes('accommodation') || textLower.includes('lodging')) {
      return 'Accommodation';
    }
    
    // Entertainment
    if (vendorLower.includes('cinema') || vendorLower.includes('theater') ||
        vendorLower.includes('movie') || vendorLower.includes('concert') ||
        vendorLower.includes('museum') || vendorLower.includes('park') ||
        vendorLower.includes('zoo') || vendorLower.includes('aquarium') ||
        textLower.includes('entertainment') || textLower.includes('ticket')) {
      return 'Entertainment';
    }
    
    // Shopping
    if (vendorLower.includes('store') || vendorLower.includes('shop') ||
        vendorLower.includes('market') || vendorLower.includes('walmart') ||
        vendorLower.includes('target') || vendorLower.includes('amazon') ||
        vendorLower.includes('mall') || vendorLower.includes('outlet') ||
        textLower.includes('purchase') || textLower.includes('retail')) {
      return 'Shopping';
    }
    
    // Groceries
    if (vendorLower.includes('grocery') || vendorLower.includes('supermarket') ||
        vendorLower.includes('safeway') || vendorLower.includes('kroger') ||
        vendorLower.includes('whole foods') || vendorLower.includes('trader joe') ||
        textLower.includes('groceries') || textLower.includes('produce')) {
      return 'Groceries';
    }
    
    // Default category
    return 'Other';
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
        category: receiptData.category, // Intelligently detected category
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