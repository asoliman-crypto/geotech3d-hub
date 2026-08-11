-- ---------------------------------------------------------------------------
-- ONE-TIME SETUP so adding a user from the app just works, forever.
--
-- WHY THIS IS NEEDED
-- The app creates a colleague's login with the public key. Supabase will not
-- let a public key confirm an address, so while "Confirm email" is switched on
-- every account the app creates stays locked and has to be repaired by hand.
--
-- Switching that setting off fixes it — but on its own it would let ANY
-- stranger register, and today every signed-in user can read the whole
-- workspace. So this script closes that hole first: from now on, reading and
-- writing company data requires a profile row, which only an admin can create.
-- A stranger who registers ends up with an account that can see nothing.
--
-- RUN THIS FIRST, then switch the setting off (see the note at the bottom).
-- Safe to re-run.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

-- Who counts as a member of this workspace: someone an admin has given a
-- profile row to. security definer so the check itself is not blocked by RLS.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where auth_user_id = auth.uid()
  );
$$;
grant execute on function public.is_member() to authenticated;

-- Replace "any signed-in user" with "any member of this workspace" on every
-- table that holds company data.
do $$
declare t text;
begin
  foreach t in array array[
    'projects','tasks','comments','notifications','attendance','audit_log','app_state'
  ]
  loop
    execute format('drop policy if exists "read %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "write %1$s" on public.%1$s;', t);
    execute format(
      'create policy "read %1$s" on public.%1$s
         for select to authenticated using (public.is_member());', t);
    execute format(
      'create policy "write %1$s" on public.%1$s
         for all to authenticated using (public.is_member())
         with check (public.is_member());', t);
  end loop;
end $$;

-- The staff directory: members may read it; only admins may change it. A
-- brand-new signup is not a member, so it stays invisible to them.
drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles
  for select to authenticated using (public.is_member());

-- Check — every row should say true.
select
  (select count(*) from public.profiles)                        as profiles,
  (select count(*) from public.profiles where auth_user_id is null) as unlinked_should_be_zero,
  public.is_member()                                            as you_are_a_member;

-- ---------------------------------------------------------------------------
-- NOW THE ONE TOGGLE (this is the part that ends the manual work):
--
--   Authentication  ->  Sign In / Providers  ->  Email
--   turn OFF "Confirm email"   ->  Save
--
-- After that, adding someone from Users & Roles in the app creates a working
-- login immediately. No SQL, no dashboard, nothing to ask anyone about.
-- ---------------------------------------------------------------------------
