begin;

alter table public.editions add column back_cover_url text;
comment on column public.editions.back_cover_url is
  'Optional back cover copied to the existing public edition-covers bucket. Does not replace any front cover or movie poster.';

-- Preserve the existing copy-on-write/RLS contract. The extra key is optional
-- so older clients keep the current back cover when editing other metadata.
create or replace function public.edit_collection_edition(p_item_id uuid, p_expected_edition_id uuid, p_fields jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  owned public.collection_items%rowtype;
  original public.editions%rowtype;
  replacement uuid;
  new_name text;
  new_publisher text;
  new_country text;
  new_region text;
  new_cover text;
  new_back_cover text;
  new_discs integer;
  k text;
  object_key text;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object'
     or not (p_fields ?& array['edition_name','publisher','country','region','disc_count','custom_cover_url']) then
    raise exception 'Invalid edition fields' using errcode='22023';
  end if;
  for k in select jsonb_object_keys(p_fields) loop
    if k <> all(array['edition_name','publisher','country','region','disc_count','custom_cover_url','back_cover_url']) then
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
  select * into strict original from public.editions where id=owned.edition_id;
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
  if row(new_name,new_publisher,new_country,new_region,new_discs,new_cover,new_back_cover) is not distinct from
     row(original.edition_name,original.publisher,original.country,original.region,original.disc_count,original.custom_cover_url,original.back_cover_url) then
    return original.id;
  end if;
  insert into public.editions(movie_id, barcode, media_format, packaging_type, publisher, region, country,
    edition_name, product_image_url, custom_cover_url, back_cover_url, is_special_edition, is_limited_edition, disc_count, release_year)
  values (original.movie_id, original.barcode, original.media_format, original.packaging_type, new_publisher,
    new_region, new_country, new_name, original.product_image_url, new_cover, new_back_cover, original.is_special_edition,
    original.is_limited_edition, new_discs, original.release_year)
  returning id into replacement;
  update public.collection_items set edition_id=replacement where id=owned.id and user_id=auth.uid();
  return replacement;
end;
$$;
revoke all on function public.edit_collection_edition(uuid,uuid,jsonb) from public, anon;
grant execute on function public.edit_collection_edition(uuid,uuid,jsonb) to authenticated;
comment on function public.edit_collection_edition(uuid,uuid,jsonb) is
  'Atomically clone edition metadata and optional back cover, relinking only the caller-owned copy. Omitted back_cover_url is preserved for older clients.';

commit;
