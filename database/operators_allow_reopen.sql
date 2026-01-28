-- Allow reopening CLOSED events (transition from CLOSED to OPEN)
-- Allow reverting OPEN events back to LIVE (transition from OPEN to LIVE)
-- This modifies the trigger to allow these state changes,
-- but still prevents other edits to CLOSED events

CREATE OR REPLACE FUNCTION prevent_closed_event_edits()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow state transition from CLOSED to OPEN (reopening)
  IF OLD.state = 'CLOSED' AND NEW.state = 'OPEN' THEN
    RETURN NEW;
  END IF;
  
  -- Allow state transition from OPEN to LIVE (reverting)
  IF OLD.state = 'OPEN' AND NEW.state = 'LIVE' THEN
    RETURN NEW;
  END IF;
  
  -- Prevent all other edits to CLOSED events
  IF OLD.state = 'CLOSED' THEN
    RAISE EXCEPTION 'Cannot edit CLOSED events';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
