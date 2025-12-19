-- Migration: Add visitor sessions and live chat tables
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id VARCHAR NOT NULL,
  page_url TEXT,
  referrer TEXT,
  chat_mode VARCHAR(20) DEFAULT 'ai',
  visitor_name VARCHAR,
  visitor_email VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_session_id VARCHAR NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_project ON visitor_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session ON live_chat_messages(visitor_session_id);
