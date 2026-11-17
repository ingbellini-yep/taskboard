-- ═══════════════════════════════════════════════════════════════════════════
-- TASKBOARD — Rollback di emergenza della migration 004 (RLS)
-- Rif. TASKBOARD_LOGIN_RLS_SPECS.md REV01, §5.4
--
-- ⚠️  Riporta il database allo stato ESPOSTO precedente (RLS spenta, anon con tutti
--     i privilegi). Da usare solo per ripristinare il servizio mentre si corregge l'app.
--     Non è una migrazione: eseguire a mano dall'editor SQL di Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  for t in select tablename from pg_tables
           where schemaname = 'public' and tablename like 'tb\_%'
             and tablename <> 'tb_allowed_users' loop
    execute format('alter table public.%I disable row level security', t);
    execute format('grant all on public.%I to anon', t);
  end loop;
end $$;
