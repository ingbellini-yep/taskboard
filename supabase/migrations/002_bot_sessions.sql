-- ═══════════════════════════════════════════════════════════════════
-- TASKBOARD — Migration 002: Sessioni bot Telegram
-- Necessaria per conversazioni multi-step in ambiente serverless
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE tb_bot_sessions (
  ses_chat_id    BIGINT PRIMARY KEY,
  ses_state      TEXT NOT NULL DEFAULT 'idle',
  ses_data       JSONB DEFAULT '{}',
  ses_updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tb_bot_sessions_state ON tb_bot_sessions(ses_state);
