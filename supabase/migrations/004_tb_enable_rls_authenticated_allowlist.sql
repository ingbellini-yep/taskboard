-- ═══════════════════════════════════════════════════════════════════════════
-- TASKBOARD — Migration 004: RLS + allowlist utenti (FASE B)
-- Rif. TASKBOARD_LOGIN_RLS_SPECS.md REV01, §5.2
-- Nome migrazione Supabase: tb_enable_rls_authenticated_allowlist
--
-- Applicata in produzione il 17/11/2026, dopo il collaudo della Fase A (login).
-- Con la RLS attiva una PWA senza sessione utente non legge più alcun dato.
--
-- Storage (§5.3): NON necessario. Il bucket tb-attachments è letto e scritto solo dal
-- bot Telegram (bot/storage.py) con service_role; la PWA non accede a Storage.
--
-- Dopo l'esecuzione: applicare 005_tb_config_nota_rls.sql.
-- Rollback di emergenza: supabase/rollback/004_rollback_rls.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Lista degli utenti abilitati al Taskboard
create table if not exists public.tb_allowed_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.tb_allowed_users enable row level security;
revoke all on public.tb_allowed_users from anon, authenticated;
grant select on public.tb_allowed_users to authenticated;
drop policy if exists tb_allowed_users_self on public.tb_allowed_users;
create policy tb_allowed_users_self on public.tb_allowed_users
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Utente Auth dedicato al Taskboard (creato il 17/11/2026)
insert into public.tb_allowed_users (user_id)
values ('7978807a-0f7d-4ea8-a302-1cff3905915f')
on conflict (user_id) do nothing;

-- 2. RLS + policy unica su tutte le tabelle tb_*
do $$
declare t text;
begin
  foreach t in array array[
    'tb_workspaces','tb_projects','tb_record_counters','tb_records',
    'tb_record_items','tb_attachments','tb_change_log','tb_bot_sessions',
    'tb_config','tb_purchases','tb_purchase_quotes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_allowed', t);
    execute format($p$
      create policy %I on public.%I
        for all to authenticated
        using (exists (select 1 from public.tb_allowed_users a
                       where a.user_id = (select auth.uid())))
        with check (exists (select 1 from public.tb_allowed_users a
                            where a.user_id = (select auth.uid())))
    $p$, t || '_allowed', t);
  end loop;
end $$;

-- 3. Viste: rispettano la RLS di chi interroga
alter view public.tb_v_purchase_totals  set (security_invoker = true);
alter view public.tb_v_purchase_monthly set (security_invoker = true);
revoke all on public.tb_v_purchase_totals, public.tb_v_purchase_monthly from anon;

-- 4. Funzioni tb_*: niente esecuzione anonima, search_path fisso
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'tb\_%'
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
    execute format('alter function %s set search_path = public', f);
  end loop;
end $$;
