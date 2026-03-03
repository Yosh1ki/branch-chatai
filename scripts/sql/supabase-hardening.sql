-- Supabase hardening for this project (NextAuth + Prisma direct DB access).
-- Run in Supabase SQL Editor as postgres after migrations are applied.
--
-- Before running:
-- 1) Replace the app_prisma password below.
-- 2) Keep MIGRATE_DATABASE_URL on postgres role.
-- 3) Use app_prisma in DATABASE_URL_RUNTIME for app runtime.

begin;

-- Create least-privilege runtime role for Prisma if missing.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_prisma') then
    create role app_prisma
      login
      password ''
      noinherit
      nocreatedb
      nocreaterole;
  end if;
end $$;

-- Restrict client-facing roles.
revoke usage on schema public from anon, authenticated;
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke all privileges on all routines in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on routines from anon, authenticated;

-- Grant only required runtime privileges to app_prisma.
grant usage on schema public to app_prisma;
grant select, insert, update, delete on all tables in schema public to app_prisma;
grant usage, select, update on all sequences in schema public to app_prisma;

-- Ensure future objects from postgres migrations are accessible to app_prisma.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to app_prisma;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to app_prisma;

-- Enable RLS and allow only backend roles.
do $$
declare
  t text;
  r text;
  app_tables text[] := array[
    'users',
    'accounts',
    'sessions',
    'verification_tokens',
    'chats',
    'messages',
    'branches',
    'usage_stats',
    'stripe_webhook_events'
  ];
  backend_roles text[] := array['postgres', 'service_role', 'app_prisma'];
  p record;
begin
  foreach t in array app_tables loop
    execute format('alter table public.%I enable row level security', t);

    for p in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    foreach r in array backend_roles loop
      if exists (select 1 from pg_roles where rolname = r) then
        execute format(
          'create policy %I on public.%I for all to %I using (true) with check (true)',
          t || '_' || r || '_all',
          t,
          r
        );
      end if;
    end loop;
  end loop;
end $$;

commit;

-- Verification queries
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in (
--     'users','accounts','sessions','verification_tokens',
--     'chats','messages','branches','usage_stats','stripe_webhook_events'
--   )
-- order by tablename;
--
-- select tablename, policyname, roles, cmd
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'users','accounts','sessions','verification_tokens',
--     'chats','messages','branches','usage_stats','stripe_webhook_events'
--   )
-- order by tablename, policyname;
--
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and grantee in ('anon', 'authenticated')
-- order by grantee, table_name;
