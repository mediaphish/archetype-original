-- AO Automation — Brand assets (logos) for Studio quote cards
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS ao_brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'logo' CHECK (kind IN ('logo')),
  label TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'other' CHECK (variant IN ('mark', 'wordmark', 'lockup_light', 'lockup_dark', 'other')),
  mime_type TEXT,
  file_name TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  public_url TEXT,
  is_default_light BOOLEAN NOT NULL DEFAULT false,
  is_default_dark BOOLEAN NOT NULL DEFAULT false,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_brand_assets_kind ON ao_brand_assets(kind);
CREATE INDEX IF NOT EXISTS idx_ao_brand_assets_created_at ON ao_brand_assets(created_at DESC);

