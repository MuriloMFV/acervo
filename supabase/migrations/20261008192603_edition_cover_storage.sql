begin;
-- Covers are catalog images, intentionally public; object names contain UUIDs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('edition-covers', 'edition-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- The Edge Function uploads with the caller's JWT: no service-role bypass.
-- Immutable objects: no UPDATE/DELETE policy, because other copies may reuse them.
create policy edition_covers_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'edition-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
);
create policy edition_covers_select_own on storage.objects
for select to authenticated
using (bucket_id = 'edition-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
