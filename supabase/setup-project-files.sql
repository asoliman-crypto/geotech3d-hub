-- ---------------------------------------------------------------------------
-- ONE-TIME SETUP for the project file workspace.
--
-- Creates a private storage bucket for project documents (financial proposals,
-- quotations, anything small attached to a project) and locks it to the same
-- rule as the rest of the data: only people an admin has added can read or
-- write. Nothing is publicly reachable — the app hands out short-lived signed
-- links when someone opens a file.
--
-- Paste into the Supabase SQL Editor and press Run. Safe to re-run.
-- ---------------------------------------------------------------------------

-- 10 MB per file is plenty for a proposal or a scanned document.
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 10485760)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760;

-- Same membership rule the rest of the workspace uses.
drop policy if exists "members read project files"   on storage.objects;
drop policy if exists "members upload project files" on storage.objects;
drop policy if exists "members update project files" on storage.objects;
drop policy if exists "members delete project files" on storage.objects;

create policy "members read project files" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-files' and public.is_member());

create policy "members upload project files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-files' and public.is_member());

create policy "members update project files" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-files' and public.is_member())
  with check (bucket_id = 'project-files' and public.is_member());

create policy "members delete project files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-files' and public.is_member());

-- Check: one row, public = false.
select id, public, file_size_limit
from storage.buckets
where id = 'project-files';
