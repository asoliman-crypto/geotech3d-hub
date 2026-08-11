-- ---------------------------------------------------------------------------
-- Repair the four accounts added through "Users & Roles" on 2026-08-10.
--
-- They were saved as directory entries only: the app wrote a `profiles` row but
-- never created a Supabase Auth user, so signing in was impossible. (The app
-- has since been fixed — new users now get a real login.)
--
-- This script:
--   1. removes the two duplicate profiles from the retry attempts
--   2. creates the missing Auth logins, pre-confirmed, password Geo@123456
--   3. clears the plaintext passwords that were stored in the profile rows
--   4. backfills profiles.email and keeps it in sync from now on, so signing
--      in with a short username works for these accounts too
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

-- 1) Drop the superseded duplicates (same username, wrong email).
delete from public.profiles where id in ('hassan-ahmed', 'nada-samy');

-- 2) Create the missing logins.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(), 'authenticated', 'authenticated',
  v.email, crypt('Geo@123456', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', v.name, 'username', v.uname),
  '', '', '', ''
from (values
  ('hassankatoo@gmail.com',              'Hassan Ahmed',   'hassan.ahmed'),
  ('mahmoudgamalabdelatty963@gmail.com', 'Mahmoud Gamal',  'mahmoud.gamal'),
  ('mostafafahmi95@gmail.com',           'Moustafa Fahmy', 'moustafa.fahmy'),
  ('nadasamy27121991@gmail.com',         'Nada Samy',      'nada.samy')
) as v(email, name, uname)
where not exists (select 1 from auth.users u where lower(u.email) = v.email);

-- 3) The email/password identity, without which sign-in fails.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email,
                     'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where lower(u.email) in (
  'hassankatoo@gmail.com', 'mahmoudgamalabdelatty963@gmail.com',
  'mostafafahmi95@gmail.com', 'nadasamy27121991@gmail.com'
)
and not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

-- 4) Stop storing readable passwords in the directory rows.
update public.profiles
set data = data - 'password'
where data ? 'password' and coalesce(data->>'password', '') <> '';

-- 5) Backfill the email column and link each profile to its login.
update public.profiles p
set email = coalesce(p.email, p.data->>'email'),
    auth_user_id = coalesce(p.auth_user_id, u.id)
from auth.users u
where lower(u.email) = lower(coalesce(p.email, p.data->>'email'));

-- 6) Keep email in sync going forward. The app writes only (id, data), so
--    without this the email column stays null and email_for_login() — which
--    is what lets people sign in with a short username — finds nothing.
create or replace function public.sync_profile_role()
returns trigger language plpgsql as $$
begin
  new.role  := new.data->>'role';
  new.email := coalesce(new.data->>'email', new.email);
  new.updated_at := now();
  return new;
end;
$$;

-- 7) Check: all four should come back with login_exists = true.
select p.id,
       p.email,
       p.role,
       (p.auth_user_id is not null) as linked,
       exists (select 1 from auth.users u where lower(u.email) = lower(p.email)) as login_exists
from public.profiles p
where p.email in (
  'hassankatoo@gmail.com', 'mahmoudgamalabdelatty963@gmail.com',
  'mostafafahmi95@gmail.com', 'nadasamy27121991@gmail.com'
)
order by p.email;
