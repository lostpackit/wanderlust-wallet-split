-- Add expense source tracking
ALTER TABLE expenses ADD COLUMN expense_source TEXT NOT NULL DEFAULT 'manual';

-- Add comment for clarity
COMMENT ON COLUMN expenses.expense_source IS 'Source of expense data: manual, scanned_receipt';