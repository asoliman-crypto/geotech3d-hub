-- ---------------------------------------------------------------------------
-- RESET ANY USER'S PASSWORD
--
-- Passwords cannot be *read* — Supabase stores a one-way hash, so neither you
-- nor Supabase can recover someone's password. Resetting is the way to help
-- someone who is locked out.
--
-- The usual "email me a reset link" flow does NOT work for most accounts here,
-- because they use @geotech3d.local addresses that cannot receive mail. This
-- script sets the password directly instead.
--
-- HOW TO USE
--   1. Open the Supabase SQL Editor.
--   2. Edit the two values in the SELECT below.
--   3. Run. You should get one row back with reset = true.
--   4. Tell the person their new password and ask them to change it from
--      "Change password" in the app's sidebar.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

with input as (
  select
    'mahmoud.mohamed'::text as who,          -- <<< username OR email
    'NewPass2026!'::text    as new_password  -- <<< the new password (8+ characters)
),
target as (
  select u.id, u.email
  from auth.users u
  where lower(u.email) = (
    select lower(coalesce(
      (select p.email from public.profiles p
        where lower(p.email) = lower(i.who)
           or lower(p.data->>'username') = lower(i.who)
        limit 1),
      i.who
    ))
    from input i
  )
)
update auth.users u
set encrypted_password = crypt((select new_password from input), gen_salt('bf')),
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    updated_at = now()
from target t
where u.id = t.id
returning u.email, true as reset;

-- Nothing returned? Then no auth login exists for that person yet — they were
-- only added to the directory. Use supabase/create-auth-user.sql to create it.
