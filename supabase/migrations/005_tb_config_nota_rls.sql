-- ═══════════════════════════════════════════════════════════════════════════
-- TASKBOARD — Migration 005: aggiornamento istruzioni in tb_config (FASE B)
-- Rif. TASKBOARD_LOGIN_RLS_SPECS.md REV01, §5.2 (note)
-- Da applicare subito dopo 004_tb_enable_rls_authenticated_allowlist.sql.
-- Sostituisce, nella sezione "Note tecniche" delle istruzioni, la riga sulla RLS.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_old constant text := 'RLS disabilitata sulle tb_; chiave anon sufficiente';
  v_new constant text := 'RLS attiva sulle tb_: accesso solo via connettore/MCP Supabase, `service_role` o utente abilitato in `tb_allowed_users`; la chiave anon non dà accesso';
  v_rows integer;
begin
  update public.tb_config
     set cfg_value = replace(cfg_value, v_old, v_new)
   where cfg_key = 'istruzioni'
     and position(v_old in cfg_value) > 0;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'tb_config: riga "%" non trovata nelle istruzioni (già aggiornata o testo cambiato)', v_old;
  end if;
end $$;
