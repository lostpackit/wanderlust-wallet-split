-- Create exchange rates cache table
CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL CHECK (rate > 0),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency, date)
);

-- Create index for efficient querying
CREATE INDEX idx_exchange_rates_date ON public.exchange_rates(date);
CREATE INDEX idx_exchange_rates_currencies ON public.exchange_rates(base_currency, target_currency);

-- Enable RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for exchange rates (read-only for authenticated users)
CREATE POLICY "Authenticated users can view exchange rates" 
ON public.exchange_rates 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- System can insert/update rates
CREATE POLICY "System can manage exchange rates" 
ON public.exchange_rates 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create function to update timestamps
CREATE TRIGGER update_exchange_rates_updated_at
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();