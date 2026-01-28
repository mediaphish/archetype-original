-- Add pot_amount_won column to operators_roi_winners
-- This stores the winner's portion (50% of total pot after 25% host and 25% AO)

ALTER TABLE operators_roi_winners
ADD COLUMN IF NOT EXISTS pot_amount_won DECIMAL(10, 2);

-- Add index for sorting by pot amount
CREATE INDEX IF NOT EXISTS idx_operators_roi_winners_pot_amount ON operators_roi_winners(pot_amount_won DESC);
