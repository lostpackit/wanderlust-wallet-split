-- Add support for per-transaction shares
-- Add a new column to store shares for each participant in an expense
ALTER TABLE public.expenses 
ADD COLUMN transaction_shares JSONB;

-- The transaction_shares column will store data like:
-- {"participant_id_1": 2, "participant_id_2": 1, "participant_id_3": 3}
-- This allows different share counts per transaction while maintaining backward compatibility