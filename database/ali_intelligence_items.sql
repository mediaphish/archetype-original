-- ALI Intelligence Items Schema
-- Stores AI-generated intelligence items for Super Admin review
-- Populated by the weekly generate-intelligence cron job
-- Read by /api/ali/super-admin/intelligence

CREATE TABLE IF NOT EXISTS ali_intelligence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company context (denormalized for easier querying)
  company_id UUID REFERENCES ali_companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  
  -- Leader context (optional - not all items have a specific leader)
  leader_name TEXT,
  
  -- Classification
  priority TEXT NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  type TEXT NOT NULL,  -- e.g. 'leadership challenge', 'deployment feedback', 'engagement drop'
  
  -- Metrics snapshot (optional JSONB: { aliScore, pattern, gap })
  metrics JSONB,
  
  -- AI-generated content
  description TEXT NOT NULL,
  recommendations JSONB,  -- Array of recommendation strings
  conclusion TEXT,
  
  -- Lifecycle
  dismissed_at TIMESTAMPTZ,  -- NULL = pending, set = resolved
  actions JSONB DEFAULT '[]'::jsonb,  -- Action log: [{ action, timestamp }]
  
  -- Dedupe key: prevent duplicate items for same signal
  dedupe_key TEXT,  -- e.g. 'company_id:type:YYYY-WW' for weekly deduplication
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching pending items (most common query)
CREATE INDEX IF NOT EXISTS idx_ali_intelligence_items_pending 
  ON ali_intelligence_items (dismissed_at) 
  WHERE dismissed_at IS NULL;

-- Index for weekly deduplication check
CREATE UNIQUE INDEX IF NOT EXISTS idx_ali_intelligence_items_dedupe 
  ON ali_intelligence_items (dedupe_key) 
  WHERE dedupe_key IS NOT NULL;

-- Index for company lookup
CREATE INDEX IF NOT EXISTS idx_ali_intelligence_items_company 
  ON ali_intelligence_items (company_id);

-- Trigger to update updated_at on row change
CREATE OR REPLACE FUNCTION update_ali_intelligence_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ali_intelligence_items_updated_at ON ali_intelligence_items;
CREATE TRIGGER trigger_ali_intelligence_items_updated_at
  BEFORE UPDATE ON ali_intelligence_items
  FOR EACH ROW
  EXECUTE FUNCTION update_ali_intelligence_items_updated_at();
