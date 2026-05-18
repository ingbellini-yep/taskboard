-- ═══════════════════════════════════════════════════════════════════════════
-- TASKBOARD — Migration 001: Schema completo
-- Progetto Supabase: dacekxilrahnbwwjovde.supabase.co
-- Prefisso tabelle: tb_   Prefisso campi: abbreviazione tabella
-- Data: 2026-05-18
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- TABELLA 1: Aree operative (workspace)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE tb_workspaces (
  ws_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ws_code        TEXT UNIQUE NOT NULL,   -- 'LP', 'RB', 'PNRR', 'FAM', 'PERS'
  ws_label       TEXT NOT NULL,          -- 'Libero Professionista'
  ws_color       TEXT,                   -- '#3182CE' per UI
  ws_icon        TEXT,                   -- emoji '🏗️'
  ws_sort_order  INTEGER DEFAULT 0,
  ws_active      BOOLEAN DEFAULT true,
  ws_created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed dati iniziali
INSERT INTO tb_workspaces (ws_code, ws_label, ws_color, ws_icon, ws_sort_order) VALUES
  ('LP',   'Libero Professionista', '#3182CE', '🏛️', 1),
  ('RB',   'Rebuilding Srl',        '#E53E3E', '🏗️', 2),
  ('PNRR', 'PNRR',                  '#38A169', '🇪🇺', 3),
  ('FAM',  'Famiglia',              '#D69E2E', '🏠', 4),
  ('PERS', 'Personale',             '#805AD5', '👤', 5);


-- ─────────────────────────────────────────────────────────────────────────
-- SEQUENZE per codici progressivi per workspace
-- ─────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE tb_seq_lp   START 1;
CREATE SEQUENCE tb_seq_rb   START 1;
CREATE SEQUENCE tb_seq_pnrr START 1;
CREATE SEQUENCE tb_seq_fam  START 1;
CREATE SEQUENCE tb_seq_pers START 1;


-- ─────────────────────────────────────────────────────────────────────────
-- TABELLA 2: Commesse e progetti
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE tb_projects (
  prj_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prj_code        TEXT UNIQUE NOT NULL,   -- 'LP-001', 'RB-003' (auto-generato)
  prj_ws_id       UUID REFERENCES tb_workspaces(ws_id),
  prj_ws_code     TEXT NOT NULL,          -- denorm. per query veloci
  prj_label       TEXT NOT NULL,          -- 'Depuratore Naro'
  prj_client      TEXT,                   -- cliente / stazione appaltante
  prj_status      TEXT DEFAULT 'active',  -- 'active'|'suspended'|'completed'|'archived'
  prj_priority    INTEGER DEFAULT 2,      -- 1=alta 2=media 3=bassa
  prj_start_date  DATE,
  prj_due_date    DATE,
  prj_notes       TEXT,
  prj_tags        TEXT[],
  prj_created_at  TIMESTAMPTZ DEFAULT now(),
  prj_updated_at  TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────
-- FUNZIONE: Generazione codice progetto
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tb_generate_project_code(p_ws_code TEXT)
RETURNS TEXT AS $$
DECLARE
  v_num INTEGER;
BEGIN
  CASE p_ws_code
    WHEN 'LP'   THEN v_num := nextval('tb_seq_lp');
    WHEN 'RB'   THEN v_num := nextval('tb_seq_rb');
    WHEN 'PNRR' THEN v_num := nextval('tb_seq_pnrr');
    WHEN 'FAM'  THEN v_num := nextval('tb_seq_fam');
    WHEN 'PERS' THEN v_num := nextval('tb_seq_pers');
    ELSE RAISE EXCEPTION 'Workspace code non valido: %', p_ws_code;
  END CASE;
  RETURN p_ws_code || '-' || LPAD(v_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────
-- TABELLA 3: Contatori record per tipo dentro ogni progetto
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE tb_record_counters (
  cnt_prj_id  UUID REFERENCES tb_projects(prj_id),
  cnt_kind    TEXT,      -- 'T', 'M', 'EV'
  cnt_value   INTEGER DEFAULT 0,
  PRIMARY KEY (cnt_prj_id, cnt_kind)
);


-- ─────────────────────────────────────────────────────────────────────────
-- TABELLA 4: Record (Task / Memo / Event)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE tb_records (
  rec_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rec_prj_id       UUID REFERENCES tb_projects(prj_id),    -- NULL se Inbox o Small Tasks
  rec_ws_id        UUID REFERENCES tb_workspaces(ws_id),   -- NULL se Small Tasks
  rec_prj_code     TEXT,                    -- denorm. per query veloci
  rec_ws_code      TEXT,                    -- denorm. per query veloci
  rec_code         TEXT UNIQUE,             -- 'LP-001-T-001' (auto-generato, NULL se Inbox/Small Tasks)
  rec_kind         TEXT NOT NULL,           -- 'T'|'M'|'EV'
  rec_title        TEXT NOT NULL,
  rec_body         TEXT,                    -- testo esteso, note, misure, trascrizione vocale
  rec_sub_label    TEXT,                    -- sottocommessa opzionale
  rec_status       TEXT DEFAULT 'aperto',   -- 'aperto'|'in_progress'|'sospeso'|'chiuso'|'archiviato'
  rec_priority     INTEGER DEFAULT 2,       -- 1=alta 2=normale 3=bassa
  rec_due_date     TIMESTAMPTZ,             -- scadenza task/reminder
  rec_event_start  TIMESTAMPTZ,             -- solo per rec_kind='EV'
  rec_event_end    TIMESTAMPTZ,             -- solo per rec_kind='EV'
  rec_alert_days   INTEGER,                 -- giorni anticipo avviso per EV (NULL = nessun avviso)
  rec_tags         TEXT[],
  rec_source       TEXT DEFAULT 'claude',   -- 'claude'|'telegram'|'web'
  rec_flagged      BOOLEAN DEFAULT false,   -- flag visiva
  rec_bucket       TEXT DEFAULT 'project',  -- 'project'|'inbox'|'small_tasks'
  rec_created_at   TIMESTAMPTZ DEFAULT now(),
  rec_updated_at   TIMESTAMPTZ DEFAULT now(),
  rec_done_at      TIMESTAMPTZ              -- timestamp chiusura

  CONSTRAINT rec_kind_check CHECK (rec_kind IN ('T', 'M', 'EV')),
  CONSTRAINT rec_status_check CHECK (rec_status IN ('aperto', 'in_progress', 'sospeso', 'chiuso', 'archiviato')),
  CONSTRAINT rec_bucket_check CHECK (rec_bucket IN ('project', 'inbox', 'small_tasks')),
  CONSTRAINT rec_priority_check CHECK (rec_priority BETWEEN 1 AND 3),
  CONSTRAINT rec_event_dates_check CHECK (
    rec_kind != 'EV' OR (rec_event_start IS NULL OR rec_event_end IS NULL OR rec_event_end > rec_event_start)
  )
);

-- Indici per query frequenti
CREATE INDEX idx_tb_records_prj_id    ON tb_records(rec_prj_id);
CREATE INDEX idx_tb_records_ws_id     ON tb_records(rec_ws_id);
CREATE INDEX idx_tb_records_status    ON tb_records(rec_status);
CREATE INDEX idx_tb_records_kind      ON tb_records(rec_kind);
CREATE INDEX idx_tb_records_bucket    ON tb_records(rec_bucket);
CREATE INDEX idx_tb_records_due_date  ON tb_records(rec_due_date);
CREATE INDEX idx_tb_records_event_start ON tb_records(rec_event_start) WHERE rec_kind = 'EV';
CREATE INDEX idx_tb_records_flagged   ON tb_records(rec_flagged) WHERE rec_flagged = true;


-- ─────────────────────────────────────────────────────────────────────────
-- FUNZIONE: Generazione codice record
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tb_generate_record_code(p_prj_id UUID, p_kind TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prj_code TEXT;
  v_num      INTEGER;
BEGIN
  SELECT prj_code INTO v_prj_code FROM tb_projects WHERE prj_id = p_prj_id;

  IF v_prj_code IS NULL THEN
    RAISE EXCEPTION 'Progetto non trovato: %', p_prj_id;
  END IF;

  INSERT INTO tb_record_counters (cnt_prj_id, cnt_kind, cnt_value)
  VALUES (p_prj_id, p_kind, 1)
  ON CONFLICT (cnt_prj_id, cnt_kind)
  DO UPDATE SET cnt_value = tb_record_counters.cnt_value + 1
  RETURNING cnt_value INTO v_num;

  RETURN v_prj_code || '-' || p_kind || '-' || LPAD(v_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────
-- TABELLA 5: Allegati (foto, vocali, file)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE tb_attachments (
  att_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  att_rec_id        UUID REFERENCES tb_records(rec_id) ON DELETE CASCADE,
  att_filename      TEXT NOT NULL,
  att_storage_path  TEXT NOT NULL,        -- percorso Supabase Storage bucket 'tb-attachments'
  att_mime_type     TEXT,                 -- 'image/jpeg'|'audio/ogg'|'application/pdf'
  att_size_bytes    INTEGER,
  att_caption       TEXT,                 -- descrizione foto o trascrizione Groq Whisper per vocali
  att_duration_sec  INTEGER,              -- solo per audio
  att_source        TEXT DEFAULT 'telegram',  -- 'telegram'|'claude'|'web'
  att_created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tb_attachments_rec_id ON tb_attachments(att_rec_id);


-- ─────────────────────────────────────────────────────────────────────────
-- TABELLA 6: Audit trail completo
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE tb_change_log (
  chg_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chg_rec_id      UUID REFERENCES tb_records(rec_id),
  chg_prj_id      UUID REFERENCES tb_projects(prj_id),
  chg_field       TEXT,                   -- campo modificato
  chg_old_value   TEXT,
  chg_new_value   TEXT,
  chg_action      TEXT NOT NULL,          -- 'create'|'update'|'status_change'|'delete'|'merge'|'move'
  chg_source      TEXT,                   -- 'claude'|'telegram'|'web'|'cron'
  chg_note        TEXT,
  chg_created_at  TIMESTAMPTZ DEFAULT now()

  CONSTRAINT chg_action_check CHECK (
    chg_action IN ('create', 'update', 'status_change', 'delete', 'merge', 'move')
  )
);

CREATE INDEX idx_tb_change_log_rec_id  ON tb_change_log(chg_rec_id);
CREATE INDEX idx_tb_change_log_prj_id  ON tb_change_log(chg_prj_id);
CREATE INDEX idx_tb_change_log_created ON tb_change_log(chg_created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────
-- FUNZIONE: Conflict detection cross-progetto per Event
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tb_check_event_conflicts(
  p_start      TIMESTAMPTZ,
  p_end        TIMESTAMPTZ,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  rec_id          UUID,
  rec_code        TEXT,
  prj_label       TEXT,
  ws_code         TEXT,
  rec_title       TEXT,
  rec_event_start TIMESTAMPTZ,
  rec_event_end   TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.rec_id,
    r.rec_code,
    p.prj_label,
    w.ws_code,
    r.rec_title,
    r.rec_event_start,
    r.rec_event_end
  FROM tb_records r
  JOIN tb_projects   p ON r.rec_prj_id = p.prj_id
  JOIN tb_workspaces w ON r.rec_ws_id  = w.ws_id
  WHERE r.rec_kind = 'EV'
    AND r.rec_status NOT IN ('chiuso', 'archiviato')
    AND r.rec_event_start IS NOT NULL
    AND r.rec_event_end   IS NOT NULL
    AND r.rec_event_start < p_end
    AND r.rec_event_end   > p_start
    AND (p_exclude_id IS NULL OR r.rec_id != p_exclude_id);
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-aggiornamento prj_updated_at su tb_projects
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tb_touch_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.prj_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tb_projects_updated_at
  BEFORE UPDATE ON tb_projects
  FOR EACH ROW EXECUTE FUNCTION tb_touch_project_updated_at();


-- ─────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-aggiornamento rec_updated_at su tb_records
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tb_touch_record_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rec_updated_at := now();
  -- Imposta rec_done_at quando il record viene chiuso
  IF NEW.rec_status IN ('chiuso', 'archiviato') AND OLD.rec_status NOT IN ('chiuso', 'archiviato') THEN
    NEW.rec_done_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tb_records_updated_at
  BEFORE UPDATE ON tb_records
  FOR EACH ROW EXECUTE FUNCTION tb_touch_record_updated_at();


-- ─────────────────────────────────────────────────────────────────────────
-- NOTE: Storage bucket da creare manualmente in Supabase Dashboard → Storage
-- Bucket name: tb-attachments
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: image/*, audio/*, application/pdf
-- ─────────────────────────────────────────────────────────────────────────
