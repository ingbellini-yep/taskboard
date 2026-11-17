-- ═══════════════════════════════════════════════════════════════════════════
-- TASKBOARD — Migration 003: Eliminazione e fusione progetti
-- Funzioni RPC atomiche richiamate dalla vista Progetto (ProgettoView)
-- Data: 2026-10-11
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- FUNZIONE: Elimina un progetto con tutti i suoi record
--   • record del progetto eliminati (sub-task, aggiornamenti e allegati in cascata;
--     i figli di altri progetti che li avevano come padre restano con parent NULL)
--   • acquisti scollegati (restano in archivio, senza progetto)
--   • change log scollegato dal progetto/record e arricchito con una riga 'delete'
--   • contatori codice del progetto rimossi
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tb_delete_project(p_prj_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_prj  tb_projects%ROWTYPE;
  v_recs INTEGER := 0;
  v_purs INTEGER := 0;
BEGIN
  SELECT * INTO v_prj FROM tb_projects WHERE prj_id = p_prj_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Progetto non trovato: %', p_prj_id;
  END IF;

  -- Acquisti: scollega (storico acquisti conservato)
  UPDATE tb_purchases
     SET pur_prj_id = NULL, pur_prj_code = NULL
   WHERE pur_prj_id = p_prj_id;
  GET DIAGNOSTICS v_purs = ROW_COUNT;

  -- Change log: scollega da record e progetto (FK senza cascata)
  UPDATE tb_change_log
     SET chg_rec_id = NULL
   WHERE chg_rec_id IN (SELECT rec_id FROM tb_records WHERE rec_prj_id = p_prj_id);
  UPDATE tb_change_log
     SET chg_prj_id = NULL
   WHERE chg_prj_id = p_prj_id;

  -- Record (items e allegati in cascata, rec_parent_id → SET NULL)
  DELETE FROM tb_records WHERE rec_prj_id = p_prj_id;
  GET DIAGNOSTICS v_recs = ROW_COUNT;

  DELETE FROM tb_record_counters WHERE cnt_prj_id = p_prj_id;
  DELETE FROM tb_projects        WHERE prj_id = p_prj_id;

  INSERT INTO tb_change_log (chg_field, chg_old_value, chg_action, chg_source, chg_note)
  VALUES (
    'project', v_prj.prj_code, 'delete', 'web',
    format('Eliminato progetto %s — %s (%s record eliminati, %s acquisti scollegati)',
           v_prj.prj_code, v_prj.prj_label, v_recs, v_purs)
  );

  RETURN jsonb_build_object(
    'prj_code',           v_prj.prj_code,
    'prj_label',          v_prj.prj_label,
    'records_deleted',    v_recs,
    'purchases_unlinked', v_purs
  );
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────
-- FUNZIONE: Fonde il progetto sorgente nel progetto destinazione
--   • i record della sorgente passano alla destinazione e ricevono un nuovo
--     codice nella numerazione della destinazione (il vecchio codice è tracciato
--     in tb_change_log con azione 'merge')
--   • workspace dei record allineato a quello della destinazione
--   • acquisti e change log riassegnati
--   • note, tag, cliente e date della sorgente riportati sulla destinazione
--     (le note sono accodate con intestazione che cita codice e nome sorgente)
--   • la sorgente viene eliminata
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tb_merge_projects(p_source_id UUID, p_target_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_src      tb_projects%ROWTYPE;
  v_dst      tb_projects%ROWTYPE;
  r          RECORD;
  v_new_code TEXT;
  v_recs     INTEGER := 0;
  v_purs     INTEGER := 0;
BEGIN
  IF p_source_id = p_target_id THEN
    RAISE EXCEPTION 'Progetto sorgente e destinazione coincidono';
  END IF;

  SELECT * INTO v_src FROM tb_projects WHERE prj_id = p_source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Progetto sorgente non trovato: %', p_source_id; END IF;
  SELECT * INTO v_dst FROM tb_projects WHERE prj_id = p_target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Progetto destinazione non trovato: %', p_target_id; END IF;

  -- Record: nuovo codice nella numerazione della destinazione (ordine cronologico)
  FOR r IN
    SELECT rec_id, rec_code, rec_kind
      FROM tb_records
     WHERE rec_prj_id = p_source_id
     ORDER BY rec_created_at, rec_id
  LOOP
    v_new_code := tb_generate_record_code(p_target_id, r.rec_kind);

    UPDATE tb_records
       SET rec_prj_id   = p_target_id,
           rec_prj_code = v_dst.prj_code,
           rec_ws_id    = v_dst.prj_ws_id,
           rec_ws_code  = v_dst.prj_ws_code,
           rec_code     = v_new_code
     WHERE rec_id = r.rec_id;

    INSERT INTO tb_change_log
      (chg_rec_id, chg_prj_id, chg_field, chg_old_value, chg_new_value, chg_action, chg_source, chg_note)
    VALUES
      (r.rec_id, p_target_id, 'rec_code', r.rec_code, v_new_code, 'merge', 'web',
       format('Fusione progetto %s → %s', v_src.prj_code, v_dst.prj_code));

    v_recs := v_recs + 1;
  END LOOP;

  -- Acquisti
  UPDATE tb_purchases
     SET pur_prj_id = p_target_id, pur_prj_code = v_dst.prj_code
   WHERE pur_prj_id = p_source_id;
  GET DIAGNOSTICS v_purs = ROW_COUNT;

  -- Change log storico della sorgente
  UPDATE tb_change_log SET chg_prj_id = p_target_id WHERE chg_prj_id = p_source_id;

  -- Anagrafica destinazione: integra note, tag, cliente e date
  UPDATE tb_projects
     SET prj_notes = CASE
                       WHEN v_src.prj_notes IS NULL OR btrim(v_src.prj_notes) = '' THEN prj_notes
                       ELSE concat_ws(E'\n\n', prj_notes,
                                      format('— Note dal progetto fuso %s — %s —', v_src.prj_code, v_src.prj_label),
                                      v_src.prj_notes)
                     END,
         prj_tags       = (SELECT array_agg(DISTINCT t)
                             FROM unnest(coalesce(prj_tags, '{}') || coalesce(v_src.prj_tags, '{}')) AS t),
         prj_client     = coalesce(prj_client, v_src.prj_client),
         prj_start_date = least(prj_start_date, v_src.prj_start_date),
         prj_due_date   = coalesce(prj_due_date, v_src.prj_due_date),
         prj_priority   = least(prj_priority, v_src.prj_priority)
   WHERE prj_id = p_target_id;

  DELETE FROM tb_record_counters WHERE cnt_prj_id = p_source_id;
  DELETE FROM tb_projects        WHERE prj_id = p_source_id;

  INSERT INTO tb_change_log
    (chg_prj_id, chg_field, chg_old_value, chg_new_value, chg_action, chg_source, chg_note)
  VALUES
    (p_target_id, 'project', v_src.prj_code, v_dst.prj_code, 'merge', 'web',
     format('Fuso il progetto %s — %s in %s — %s (%s record rinumerati, %s acquisti)',
            v_src.prj_code, v_src.prj_label, v_dst.prj_code, v_dst.prj_label, v_recs, v_purs));

  RETURN jsonb_build_object(
    'source_code',     v_src.prj_code,
    'target_code',     v_dst.prj_code,
    'target_id',       p_target_id,
    'records_moved',   v_recs,
    'purchases_moved', v_purs
  );
END;
$$ LANGUAGE plpgsql;
