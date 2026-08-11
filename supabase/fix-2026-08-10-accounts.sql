-- ---------------------------------------------------------------------------
-- Give the four accounts added on 2026-08-10 a working login.
--
-- They were saved as directory entries only: the app wrote a `profiles` row but
-- never created a Supabase Auth user, so signing in was impossible. (The app
-- itself is now fixed — new users get a real login.)
--
-- The duplicate profiles and the plaintext passwords have already been cleaned
-- up. This file only does the part that needs privileges the app's public key
-- deliberately does not have: creating the sign-in credentials.
--
-- It handles both cases — creating the login if missing, and confirming and
-- resetting it if one already exists but is stuck unconfirmed.
--
-- HOW TO USE: paste the whole file into the Supabase SQL Editor and press Run.
-- Expect four rows back, all with can_sign_in = true.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

with people(email, name, uname) as (values
  ('hassankatoo@gmail.com',              'Hassan Ahmed',   'hassan.ahmed'),
  ('mahmoudgamalabdelatty963@gmail.com', 'Mahmoud Gamal',  'mahmoud.gamal'),
  ('mostafafahmi95@gmail.com',           'Moustafa Fahmy', 'moustafa.fahmy'),
  ('nadasamy27121991@gmail.com',         'Nada Samy',      'nada.samy')
),
-- 1) create the ones that have no login yet
created as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(), 'authenticated', 'authenticated',
    p.email, crypt('Geo@123456', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p.name, 'username', p.uname),
    '', '', '', ''
  from people p
  where not exists (select 1 from auth.users u where lower(u.email) = p.email)
  returning 1
)
-- 2) and confirm + reset the ones that already exist but cannot sign in
update auth.users u
set encrypted_password = crypt('Geo@123456', gen_salt('bf')),
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    updated_at = now()
from people p
where lower(u.email) = p.email;

-- 3) the email/password identity — sign-in fails without it
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

-- 4) link each profile to its login and fill the email column, which is what
--    email_for_login() reads so a short username works at the sign-in screen
update public.profiles p
set email = coalesce(p.email, p.data->>'email'),
    auth_user_id = coalesce(p.auth_user_id, u.id)
from auth.users u
where lower(u.email) = lower(coalesce(p.email, p.data->>'email'));

-- 5) keep that column in sync from now on: the app writes only (id, data)
create or replace function public.sync_profile_role()
returns trigger language plpgsql as $$
begin
  new.role  := new.data->>'role';
  new.email := coalesce(new.data->>'email', new.email);
  new.updated_at := now();
  return new;
end;
$$;

-- 6) check
select u.email,
       (u.email_confirmed_at is not null) as confirmed,
       exists (select 1 from auth.identities i
                where i.user_id = u.id and i.provider = 'email') as has_identity,
       (u.email_confirmed_at is not null) as can_sign_in
from auth.users u
where lower(u.email) in (
  'hassankatoo@gmail.com', 'mahmoudgamalabdelatty963@gmail.com',
  'mostafafahmi95@gmail.com', 'nadasamy27121991@gmail.com'
)
order by u.email;
