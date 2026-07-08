-- =====================================================================
--  GEOTECH 3D / GEOSPATIAL HUB  —  Supabase schema  (v1)
--  Run this in your Supabase project's SQL editor (Database -> SQL).
--
--  Design: "document style" — each entity is stored as its existing app
--  object inside a `data` jsonb column, so the React frontend keeps the
--  same shapes with a minimal migration. Realtime is enabled on every
--  table so the team sees changes live. RLS v1 lets any authenticated
--  team member read/write (internal tool); tighten per-role in phase 2.
-- =====================================================================

-- ---------- 1) Profiles (one row per authenticated user) --------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  email text,
  name text,
  role text not null default 'Employee',
  department text,
  title text,
  actual_role text,
  badge text,
  access_type text,
  location text,
  country_region text,
  created_at timestamptz default now()
);

-- current user's role (used by policies / the app)
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- auto-create a profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, username, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'Employee')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2) Document tables (keep app object shapes in `data`) ------
create table if not exists public.projects (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.tasks (
  id bigint primary key,
  project_id text,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists tasks_project_id_idx on public.tasks (project_id);

create table if not exists public.comments (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.attendance (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.audit_log (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

-- singletons (e.g. daily baseline, settings) keyed by a string
create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ---------- 3) Realtime -----------------------------------------------
alter publication supabase_realtime add table
  public.projects, public.tasks, public.comments, public.notifications,
  public.attendance, public.audit_log, public.app_state, public.profiles;

-- ---------- 4) Row Level Security (v1: authenticated team access) ------
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.tasks         enable row level security;
alter table public.comments      enable row level security;
alter table public.notifications enable row level security;
alter table public.attendance    enable row level security;
alter table public.audit_log     enable row level security;
alter table public.app_state     enable row level security;

-- profiles: everyone signed-in can read; you can edit your own row
create policy "profiles read"        on public.profiles for select to authenticated using (true);
create policy "profiles update self" on public.profiles for update to authenticated using (id = auth.uid());

-- operational tables: any authenticated team member can read + write (v1)
do $$
declare t text;
begin
  foreach t in array array['projects','tasks','comments','notifications','attendance','audit_log','app_state']
  loop
    execute format('create policy "%1$s read"  on public.%1$s for select to authenticated using (true);', t);
    execute format('create policy "%1$s write" on public.%1$s for all    to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- =====================================================================
-- Phase 2 (later): replace the permissive write policies above with
-- role-based ones using public.current_role() to mirror the app RBAC
-- (e.g. only Admin/GM/Manager/team_lead can write projects, etc.).
-- =====================================================================
