-- ============================================================================
-- GEOTECH 3D / GEOSPATIAL HUB — backend schema (Supabase / Postgres)
-- ----------------------------------------------------------------------------
-- Design notes:
--   * Every domain table keeps the ORIGINAL app object verbatim in a `data`
--     jsonb column. This preserves the exact shape the React app already uses
--     (numeric task ids, nested `location`/`team`/`dataLinks`/`subtasks`, the
--     `createdBy` object, etc.) so the 4000-line frontend needs almost no
--     changes — it reads `row.data` and writes the same object back.
--   * `id` is always text (String(obj.id)) so it works for both the string
--     project ids ("PRJ-1010") and the numeric task ids.
--   * RLS v1 is intentionally coarse for an INTERNAL, trusted company team:
--     any authenticated employee can read/write operational data; only admins
--     can change the user/role table (profiles). Tighten later per-row if
--     needed (see the commented policies at the bottom).
-- Run this in the Supabase SQL editor (or via the Supabase CLI) once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: which app role does the current auth user have?
-- SECURITY DEFINER so it can read profiles without tripping RLS recursion.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            text primary key,               -- app id, e.g. "mona-hassan"
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  email         text,
  role          text,                            -- extracted for RLS checks
  data          jsonb not null,                  -- full sanitized user object
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('Admin', 'gm') from public.profiles where auth_user_id = auth.uid() limit 1),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Domain tables (all share the same jsonb-backed shape)
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id         text primary key,
  project_id text,                               -- extracted from data->>'projectId'
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Singleton key/value blobs (dailyBaseline object, removedUserIds array, ...)
create table if not exists public.app_state (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_id_idx on public.tasks (project_id);

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh + mirror tasks.project_id from the jsonb payload
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_task_project_id()
returns trigger language plpgsql as $$
begin
  new.project_id := new.data->>'projectId';
  new.updated_at := now();
  return new;
end;
$$;

-- Keep the extracted profiles.role column in sync with the jsonb payload so
-- role changes made in-app are reflected in RLS checks (is_admin()).
create or replace function public.sync_profile_role()
returns trigger language plpgsql as $$
begin
  new.role := new.data->>'role';
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['projects','comments','notifications','attendance','audit_log']
  loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s;', t);
    execute format('create trigger touch_%1$s before update on public.%1$s
                    for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

drop trigger if exists sync_tasks_project on public.tasks;
create trigger sync_tasks_project before insert or update on public.tasks
  for each row execute function public.sync_task_project_id();

drop trigger if exists sync_profiles_role on public.profiles;
create trigger sync_profiles_role before insert or update on public.profiles
  for each row execute function public.sync_profile_role();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.tasks         enable row level security;
alter table public.comments      enable row level security;
alter table public.notifications enable row level security;
alter table public.attendance    enable row level security;
alter table public.audit_log     enable row level security;
alter table public.app_state     enable row level security;

-- Operational tables: any signed-in employee can read + write (v1).
do $$
declare t text;
begin
  foreach t in array array['projects','tasks','comments','notifications','attendance','audit_log','app_state']
  loop
    execute format('drop policy if exists "read %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "write %1$s" on public.%1$s;', t);
    execute format('create policy "read %1$s" on public.%1$s
                    for select to authenticated using (true);', t);
    execute format('create policy "write %1$s" on public.%1$s
                    for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Profiles: everyone signed-in can read the directory; only admins can change it.
drop policy if exists "read profiles"  on public.profiles;
drop policy if exists "admin write profiles" on public.profiles;
drop policy if exists "self update profile" on public.profiles;

create policy "read profiles" on public.profiles
  for select to authenticated using (true);

create policy "admin write profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- (optional) let a user update their own row but NOT their role — enable later:
-- create policy "self update profile" on public.profiles
--   for update to authenticated
--   using (auth_user_id = auth.uid())
--   with check (auth_user_id = auth.uid() and role = public.current_app_role());

-- ---------------------------------------------------------------------------
-- Table privileges for the API roles
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Allow the login screen to resolve a username -> email WITHOUT exposing the
-- whole user directory to anonymous visitors. SECURITY DEFINER returns only the
-- email for an exact email/username match.
create or replace function public.email_for_login(login text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles
  where lower(email) = lower(login) or lower(data->>'username') = lower(login)
  limit 1;
$$;
grant execute on function public.email_for_login(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes so every open client stays in sync live
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['projects','tasks','comments','notifications','attendance','audit_log','app_state','profiles']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%1$s;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Full row images on update/delete so realtime carries the old id for deletes
alter table public.projects      replica identity full;
alter table public.tasks         replica identity full;
alter table public.comments      replica identity full;
alter table public.notifications replica identity full;
alter table public.attendance    replica identity full;
alter table public.audit_log     replica identity full;
alter table public.app_state     replica identity full;
alter table public.profiles      replica identity full;
