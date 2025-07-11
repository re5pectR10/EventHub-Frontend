-- Create function to safely increment ticket sold count
CREATE OR REPLACE FUNCTION increment_ticket_sold(
  ticket_type_id UUID,
  quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the quantity_sold for the ticket type
  UPDATE ticket_types 
  SET 
    quantity_sold = quantity_sold + quantity,
    updated_at = NOW()
  WHERE id = ticket_type_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket type not found: %', ticket_type_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_ticket_sold(UUID, INTEGER) TO authenticated;

-- Create function to check ticket availability
CREATE OR REPLACE FUNCTION check_ticket_availability(
  ticket_type_id UUID,
  requested_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  available_quantity INTEGER;
BEGIN
  -- Get available quantity
  SELECT (quantity_available - quantity_sold) 
  INTO available_quantity
  FROM ticket_types 
  WHERE id = ticket_type_id;
  
  -- Return true if enough tickets are available
  RETURN available_quantity >= requested_quantity;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_ticket_availability(UUID, INTEGER) TO authenticated; 