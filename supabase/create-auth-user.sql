-- ---------------------------------------------------------------------------
-- Create GEOTECH 3D login accounts straight from the Supabase SQL Editor.
--
-- Why this file exists: every account uses an @geotech3d.local address, and
-- Supabase REJECTS that domain through the normal sign-up API ("Email address
-- ... is invalid"). The seeded accounts were created with the service_role
-- admin API, which skips that validation. When you don't have the service_role
-- key at hand, writing to auth.users directly is the way in — and the SQL
-- Editor runs with enough privilege to do it.
--
-- HOW TO USE
--   1. Add the account to src/auth/authData.js first (role + permissions live
--      in code — an auth user with no entry there has no role in the app).
--   2. Edit the VALUES block below.
--   3. Paste the whole file into the SQL Editor and press Run.
--   4. Expect one row per account with linked = true.
--
-- Safe to run more than once: existing accounts are skipped, not duplicated.
-- Used on 2026-07-28 to create gm.portfolio + pm.portfolio.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

-- 1) The auth users (this is what makes sign-in work at all).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(), 'authenticated', 'authenticated',
  v.email,
  crypt(v.password, gen_salt('bf')),
  now(),                                   -- pre-confirmed: .local can't receive mail
  now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', v.name, 'role', v.role, 'username', v.uname),
  '', '', '', ''
from (values
  -- email                          | display name                  | app role       | username       | password
  ('gm.portfolio@geotech3d.local', 'General Manager (Portfolio)', 'portfolio_gm', 'gm.portfolio', 'Geo@123456'),
  ('pm.portfolio@geotech3d.local', 'Project Manager (Portfolio)', 'portfolio_pm', 'pm.portfolio', 'Geo@123456')
) as v(email, name, role, uname, password)
where not exists (select 1 from auth.users u where lower(u.email) = v.email);

-- 2) The matching identity row. Without it GoTrue has no email/password
--    identity to authenticate against, so sign-in fails even though the user
--    row exists.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object(
    'sub', u.id::text, 'email', u.email,
    'email_verified', true, 'phone_verified', false
  ),
  'email', now(), now(), now()
from auth.users u
where lower(u.email) in (
  'gm.portfolio@geotech3d.local',
  'pm.portfolio@geotech3d.local'
)
and not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

-- 3) The app's own profile row. `email_for_login()` reads this table, so
--    without it people can only sign in with the full email, never the short
--    username. The sync_profiles_role trigger fills in `role` from data.
insert into public.profiles (id, email, data, auth_user_id)
values
  ('portfolio-gm', 'gm.portfolio@geotech3d.local',
   '{"id":"portfolio-gm","employeeId":null,"name":"General Manager (Portfolio)","username":"gm.portfolio","email":"gm.portfolio@geotech3d.local","role":"portfolio_gm","badge":"GM - PORTFOLIO","department":"Executive Management","title":"General Manager - Portfolio Monitoring","actualRole":"Portfolio monitoring","accessType":"Portfolio dashboard - read only"}'::jsonb,
   (select id from auth.users where lower(email) = 'gm.portfolio@geotech3d.local')),
  ('portfolio-pm', 'pm.portfolio@geotech3d.local',
   '{"id":"portfolio-pm","employeeId":null,"name":"Project Manager (Portfolio)","username":"pm.portfolio","email":"pm.portfolio@geotech3d.local","role":"portfolio_pm","badge":"PM - PORTFOLIO","department":"Project Management","title":"Project Manager - Portfolio Control","actualRole":"Portfolio status control","accessType":"Portfolio dashboard - can update project status"}'::jsonb,
   (select id from auth.users where lower(email) = 'pm.portfolio@geotech3d.local'))
on conflict (id) do update
  set email = excluded.email,
      data = excluded.data,
      auth_user_id = coalesce(excluded.auth_user_id, public.profiles.auth_user_id);

-- 4) Link any profile that was created before its auth user existed.
update public.profiles p
set auth_user_id = u.id
from auth.users u
where lower(u.email) = lower(p.email)
  and p.auth_user_id is null;

-- 5) Check: linked should be true for every account you just added.
select p.id, p.email, p.role, (p.auth_user_id is not null) as linked
from public.profiles p
where p.id like 'portfolio-%';
