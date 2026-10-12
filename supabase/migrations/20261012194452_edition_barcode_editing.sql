begin;

-- Keep legacy copy-on-write behavior for APKs that do not send a barcode field.
alter function public.edit_collection_edition(uuid,uuid,jsonb) set schema acervo_private;
alter function acervo_private.edit_collection_edition(uuid,uuid,jsonb) rename to clone_collection_edition;

-- In-place writes need a tightly scoped private function: clients still have no
-- UPDATE grant on the shared catalog. Auth, ownership, sharing and stale forms
-- are checked explicitly before changing only the editable fields.
create function acervo_private.update_collection_edition_current(p_item_id uuid, p_expected_edition_id uuid, p_fields jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owned public.collection_items%rowtype;
  original public.editions%rowtype;
  new_barcode text;
  new_name text;
  new_publisher text;
  new_country text;
  new_region text;
  new_cover text;
  new_back_cover text;
  new_discs integer;
  new_packaging public.packaging_type;
  new_encoding text;
  k text;
  object_key text;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object'
     or not (p_fields ?& array['edition_name','publisher','country','region','disc_count','custom_cover_url','barcode','expected_updated_at']) then
    raise exception 'Invalid edition fields' using errcode='22023';
  end if;
  for k in select jsonb_object_keys(p_fields) loop
    if k <> all(array['edition_name','publisher','country','region','disc_count','custom_cover_url','back_cover_url','packaging_type','video_standard','barcode','expected_updated_at']) then
      raise exception 'Unsupported edition field' using errcode='22023';
    end if;
    if k <> 'disc_count' and (jsonb_typeof(p_fields->k) not in ('string','null') or length(p_fields->>k) > case when k in ('custom_cover_url','back_cover_url') then 2048 else 200 end) then
      raise exception 'Invalid edition text' using errcode='22023';
    end if;
  end loop;
  if jsonb_typeof(p_fields->'disc_count') not in ('number','null')
    or (p_fields->>'disc_count' is not null and (p_fields->>'disc_count') !~ '^[1-9][0-9]*$') then
    raise exception 'Invalid disc count' using errcode='22023';
  end if;
  if p_fields ? 'packaging_type' and (jsonb_typeof(p_fields->'packaging_type') <> 'string'
    or p_fields->>'packaging_type' not in ('STANDARD','SNAPCASE','DIGIPAK','STEELBOOK','SLIPCASE','BOX')) then
    raise exception 'Invalid cover type' using errcode='22023';
  end if;
  if p_fields ? 'video_standard' and (jsonb_typeof(p_fields->'video_standard') not in ('string','null')
    or p_fields->>'video_standard' not in ('NTSC','PAL','PAL-M','SECAM')) then
    raise exception 'Invalid video standard' using errcode='22023';
  end if;
  if jsonb_typeof(p_fields->'expected_updated_at') is distinct from 'string'
     or nullif(btrim(p_fields->>'expected_updated_at'),'') is null then
    raise exception 'Expected edition timestamp required' using errcode='22023';
  end if;
  new_barcode := case when nullif(btrim(p_fields->>'barcode'),'') is null then null
    else regexp_replace(p_fields->>'barcode','[^0-9]','','g') end;
  if new_barcode is not null and new_barcode !~ '^(?:[0-9]{8}|[0-9]{12}|[0-9]{13})$' then
    raise exception 'Invalid barcode' using errcode='22023';
  end if;
  new_discs := (p_fields->>'disc_count')::integer;
  new_name := nullif(btrim(p_fields->>'edition_name'),'');
  new_publisher := nullif(btrim(p_fields->>'publisher'),'');
  new_country := nullif(btrim(p_fields->>'country'),'');
  new_region := nullif(btrim(p_fields->>'region'),'');
  new_cover := nullif(btrim(p_fields->>'custom_cover_url'),'');
  select * into owned from public.collection_items where id=p_item_id and user_id=auth.uid() for update;
  if not found then raise exception 'Collection item not found' using errcode='42501'; end if;
  if owned.edition_id is distinct from p_expected_edition_id then
    raise exception 'Edition changed; reload before saving' using errcode='40001';
  end if;
  -- Lock the edition before checking sharing; FK inserts also wait for this lock.
  select * into strict original from public.editions where id=owned.edition_id for update;
  if original.updated_at is distinct from (p_fields->>'expected_updated_at')::timestamptz then
    raise exception 'Edition changed; reload before saving' using errcode='40001';
  end if;
  new_encoding := case when p_fields ? 'video_standard' then p_fields->>'video_standard' else original.video_standard end;
  new_packaging := case when p_fields ? 'packaging_type' then (p_fields->>'packaging_type')::public.packaging_type else original.packaging_type end;
  new_back_cover := case when p_fields ? 'back_cover_url' then nullif(btrim(p_fields->>'back_cover_url'),'') else original.back_cover_url end;
  if new_cover is not null and new_cover is distinct from original.custom_cover_url then
    object_key := split_part(new_cover, '/storage/v1/object/public/edition-covers/', 2);
    if new_cover !~ '^https://[^/?#]+/storage/v1/object/public/edition-covers/'
       or object_key !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
       or not exists (select 1 from storage.objects where bucket_id='edition-covers' and name=object_key) then
      raise exception 'Choose a stored catalog cover' using errcode='22023';
    end if;
  end if;
  if new_back_cover is not null and new_back_cover is distinct from original.back_cover_url then
    object_key := split_part(new_back_cover, '/storage/v1/object/public/edition-covers/', 2);
    if new_back_cover !~ '^https://[^/?#]+/storage/v1/object/public/edition-covers/'
       or object_key !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
       or not exists (select 1 from storage.objects where bucket_id='edition-covers' and name=object_key) then
      raise exception 'Choose a stored back cover' using errcode='22023';
    end if;
  end if;
  if row(new_barcode,new_name,new_publisher,new_country,new_region,new_discs,new_cover,new_back_cover,new_packaging,new_encoding) is not distinct from
     row(original.barcode,original.edition_name,original.publisher,original.country,original.region,original.disc_count,original.custom_cover_url,original.back_cover_url,original.packaging_type,original.video_standard) then
    return original.id;
  end if;
  -- Catalog sharing is checked as the function owner, including rows hidden by RLS.
  if exists (select 1 from public.collection_items where edition_id=original.id and user_id<>auth.uid()) then
    raise exception 'Edition is shared with another user' using errcode='55000';
  end if;
  update public.editions set barcode=new_barcode, edition_name=new_name, publisher=new_publisher,
    country=new_country, region=new_region, disc_count=new_discs, custom_cover_url=new_cover,
    back_cover_url=new_back_cover, packaging_type=new_packaging, video_standard=new_encoding
  where id=original.id;
  return original.id;
end;
$$;

revoke all on function acervo_private.update_collection_edition_current(uuid,uuid,jsonb) from public, anon;
revoke all on function acervo_private.clone_collection_edition(uuid,uuid,jsonb) from public, anon;
grant usage on schema acervo_private to authenticated;
grant execute on function acervo_private.update_collection_edition_current(uuid,uuid,jsonb) to authenticated;
grant execute on function acervo_private.clone_collection_edition(uuid,uuid,jsonb) to authenticated;

create function public.edit_collection_edition(p_item_id uuid, p_expected_edition_id uuid, p_fields jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if p_fields ? 'barcode' then
    return acervo_private.update_collection_edition_current(p_item_id,p_expected_edition_id,p_fields);
  end if;
  return acervo_private.clone_collection_edition(p_item_id,p_expected_edition_id,p_fields);
end;
$$;
revoke all on function public.edit_collection_edition(uuid,uuid,jsonb) from public, anon;
grant execute on function public.edit_collection_edition(uuid,uuid,jsonb) to authenticated;
comment on function public.edit_collection_edition(uuid,uuid,jsonb) is
  'Barcode-aware clients update the current exclusively owned edition in place with optimistic concurrency. Older payloads keep copy-on-write behavior.';
comment on function acervo_private.update_collection_edition_current(uuid,uuid,jsonb) is
  'Private guarded update: authenticated non-anonymous owner, no other-user references, expected timestamp, existing cover validation, normalized optional barcode; never inserts or relinks editions.';

notify pgrst, 'reload schema';
commit;
