-- Add Stripe-related fields to organizers table
ALTER TABLE organizers 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Create index for Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_organizers_stripe_account_id ON organizers(stripe_account_id);

-- Create function to increment ticket sold count
CREATE OR REPLACE FUNCTION increment_ticket_sold(ticket_type_id UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE ticket_types 
  SET quantity_sold = quantity_sold + quantity
  WHERE id = ticket_type_id;
END;
$$ LANGUAGE plpgsql;

-- Add Stripe-related fields to bookings table if they don't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Create indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session_id ON bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_payment_intent_id ON bookings(stripe_payment_intent_id); 