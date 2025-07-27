-- Add currency support to trips table
ALTER TABLE trips ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'USD';

-- Add currency and receipt data to expenses table
ALTER TABLE expenses ADD COLUMN original_currency TEXT;
ALTER TABLE expenses ADD COLUMN original_amount NUMERIC;
ALTER TABLE expenses ADD COLUMN exchange_rate NUMERIC;
ALTER TABLE expenses ADD COLUMN receipt_data JSONB;

-- Add comment for clarity
COMMENT ON COLUMN trips.base_currency IS 'Base currency for the trip (e.g., USD, EUR, GBP)';
COMMENT ON COLUMN expenses.original_currency IS 'Original currency from receipt if different from base currency';
COMMENT ON COLUMN expenses.original_amount IS 'Original amount from receipt before currency conversion';
COMMENT ON COLUMN expenses.exchange_rate IS 'Exchange rate used for conversion (original to base)';
COMMENT ON COLUMN expenses.receipt_data IS 'JSON data extracted from receipt OCR';