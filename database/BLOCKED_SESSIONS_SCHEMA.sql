-- Blocked Sessions Table
CREATE TABLE IF NOT EXISTS blocked_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  client_ip TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent, timestamp = temporary (24-hour blocks)
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_sessions_session_id ON blocked_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_blocked_sessions_ip ON blocked_sessions(client_ip);

-- Blocked IPs Table
CREATE TABLE IF NOT EXISTS blocked_ips (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT UNIQUE NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent, timestamp = temporary
  reason TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);

-- Threats Log Table (for review)
CREATE TABLE IF NOT EXISTS threats (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  client_ip TEXT,
  threat_message TEXT NOT NULL,
  conversation_history JSONB,
  blocked BOOLEAN DEFAULT true,
  block_type TEXT, -- 'permanent' or 'temporary'
  assessment TEXT, -- AI assessment result
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threats_session_id ON threats(session_id);
CREATE INDEX IF NOT EXISTS idx_threats_ip ON threats(client_ip);
CREATE INDEX IF NOT EXISTS idx_threats_created_at ON threats(created_at DESC);
