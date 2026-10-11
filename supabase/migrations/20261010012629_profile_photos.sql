begin;

-- Reuse the existing avatar field for the private object key, not a signed URL.
comment on column public.profiles.avatar_url is
  'Private profile-photos object key: user UUID/avatar-UUID.ext. Signed only for display.';
alter table public.profiles add constraint profiles_avatar_scope check (
  avatar_url is null or avatar_url ~ (
    '^' || id::text || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  )
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg','image/png','image/webp']);

create policy profile_photos_select_own on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false'
);
create policy profile_photos_insert_own on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false'
  and name ~ ('^' || (select auth.uid())::text || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
);
-- Immutable names avoid stale images. Linked images cannot be removed on a
-- failed/ambiguous save; detach from the profile before deleting the object.
create policy profile_photos_delete_detached_own on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false'
  and not exists (select 1 from public.profiles p where p.avatar_url = storage.objects.name)
);

create function acervo_private.validate_profile_avatar()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- Auth creates a blank profile before the new user has a session.
  if tg_op = 'INSERT' and new.avatar_url is null then return new; end if;
  if tg_op = 'UPDATE' and new.avatar_url is not distinct from old.avatar_url then return new; end if;
  if auth.uid() is null or new.id <> auth.uid()
    or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' then
    raise exception 'Entre para alterar a foto de perfil.' using errcode = '42501';
  end if;
  if new.avatar_url is not null and (
    new.avatar_url !~ ('^' || new.id::text || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or not exists (select 1 from storage.objects where bucket_id = 'profile-photos' and name = new.avatar_url)
  ) then
    raise exception 'Foto de perfil inválida.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function acervo_private.validate_profile_avatar() from public, anon, authenticated;
create trigger profiles_validate_avatar before insert or update of avatar_url on public.profiles
for each row execute function acervo_private.validate_profile_avatar();

commit;
