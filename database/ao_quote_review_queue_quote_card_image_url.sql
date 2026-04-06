-- Public PNG URL for quote card (same pixels as scheduled post); optional until backfilled.
ALTER TABLE public.ao_quote_review_queue
  ADD COLUMN IF NOT EXISTS quote_card_image_url TEXT;

COMMENT ON COLUMN public.ao_quote_review_queue.quote_card_image_url IS 'Server-rasterized PNG URL; use for Review preview parity with social.';
