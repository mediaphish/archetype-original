-- ALI paid annual billing (2026-11-17)
--
-- One billing row per company. Annual plan, priced per leader, the leader's
-- whole team included. Founding price $149 a year, read from the site setting
-- ali_price_cents (default 14900) and locked onto the row the first time a
-- company starts billing, so founding customers keep their price.
--
-- The first 20 companies to start billing get their first year free (the
-- pilot). pilot_granted_at and pilot_number are set once, by
-- ali_billing_claim_pilot() below, and never change after that.
--
-- Additive only: creates one table and one function. Deletes nothing and does
-- not touch ali_companies.

CREATE TABLE IF NOT EXISTS ali_billing (
  company_id             UUID PRIMARY KEY REFERENCES ali_companies(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT UNIQUE,
  billing_status         TEXT NOT NULL DEFAULT 'none'
                         CHECK (billing_status IN ('none', 'pilot', 'trialing', 'active', 'past_due', 'canceled')),
  pilot_granted_at       TIMESTAMPTZ,
  pilot_number           INTEGER CHECK (pilot_number IS NULL OR pilot_number >= 1),
  paid_through           TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  leader_seats           INTEGER NOT NULL DEFAULT 1 CHECK (leader_seats >= 1),
  price_cents_locked     INTEGER CHECK (price_cents_locked IS NULL OR price_cents_locked >= 0),
  last_synced_at         TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ali_billing_customer ON ali_billing(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ali_billing_pilot_number ON ali_billing(pilot_number) WHERE pilot_number IS NOT NULL;

COMMENT ON TABLE ali_billing IS 'ALI annual billing per company. Written only by the server (service role).';
COMMENT ON COLUMN ali_billing.pilot_granted_at IS 'Set once when the company got one of the free pilot years. Never cleared.';
COMMENT ON COLUMN ali_billing.price_cents_locked IS 'Price per leader per year the company signed up at (founding price stays).';

-- Server only: no browser access at all.
ALTER TABLE ali_billing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ali_billing FROM anon, authenticated;
GRANT ALL ON ali_billing TO service_role;

-- Claim a pilot year for one company, safely when two companies start at the
-- same moment (one lock, so spot 20 is never handed out twice).
-- Returns is_pilot = true and pilot_no when it has (or now
-- gets) a pilot year; is_pilot = false when the spots are gone or the company
-- already started a paid plan.
CREATE OR REPLACE FUNCTION ali_billing_claim_pilot(p_company_id UUID, p_slots INTEGER, p_price_cents INTEGER)
RETURNS TABLE (is_pilot BOOLEAN, pilot_no INTEGER)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_at    TIMESTAMPTZ;
  v_num   INTEGER;
  v_sub   TEXT;
  v_count INTEGER;
  v_next  INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ali_billing_pilot'));

  INSERT INTO ali_billing (company_id, price_cents_locked)
  VALUES (p_company_id, p_price_cents)
  ON CONFLICT (company_id) DO NOTHING;

  SELECT b.pilot_granted_at, b.pilot_number, b.stripe_subscription_id
    INTO v_at, v_num, v_sub
    FROM ali_billing b
   WHERE b.company_id = p_company_id
   FOR UPDATE;

  IF v_at IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, v_num;
    RETURN;
  END IF;

  IF v_sub IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count FROM ali_billing b WHERE b.pilot_granted_at IS NOT NULL;
  IF v_count >= p_slots THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT COALESCE(MAX(b.pilot_number), 0) + 1 INTO v_next FROM ali_billing b;

  UPDATE ali_billing b
     SET pilot_granted_at   = NOW(),
         pilot_number       = v_next,
         billing_status     = CASE WHEN b.billing_status = 'none' THEN 'pilot' ELSE b.billing_status END,
         paid_through       = COALESCE(b.paid_through, NOW() + INTERVAL '365 days'),
         price_cents_locked = COALESCE(b.price_cents_locked, p_price_cents),
         updated_at         = NOW()
   WHERE b.company_id = p_company_id;

  RETURN QUERY SELECT TRUE, v_next;
END;
$$;

REVOKE ALL ON FUNCTION ali_billing_claim_pilot(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ali_billing_claim_pilot(UUID, INTEGER, INTEGER) TO service_role;
