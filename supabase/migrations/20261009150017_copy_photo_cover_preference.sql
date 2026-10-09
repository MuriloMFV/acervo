begin;

alter table public.collection_items add column use_photo_as_cover boolean not null default false;
comment on column public.collection_items.use_photo_as_cover is
  'Opt-in cover override for this personal copy only; never changes Edition/Movie catalog images.';

-- Removing the photo restores the catalog cover, including for older clients.
create function acervo_private.normalize_copy_cover()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.photo_url is null then new.use_photo_as_cover := false; end if;
  return new;
end;
$$;
revoke all on function acervo_private.normalize_copy_cover() from public, anon, authenticated;
create trigger collection_items_normalize_copy_cover before insert or update on public.collection_items
  for each row execute function acervo_private.normalize_copy_cover();
alter table public.collection_items add constraint collection_items_cover_requires_photo
  check (not use_photo_as_cover or photo_url is not null);

-- Existing ownership RLS and private Storage policies remain unchanged.
commit;
