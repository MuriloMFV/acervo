begin;

-- Optional encoding is distinct from playback region; existing rows remain unchanged.
alter table public.editions add column video_standard text
  check (video_standard in ('NTSC','PAL','PAL-M','SECAM'));
alter table public.box_sets add column video_standard text
  check (video_standard in ('NTSC','PAL','PAL-M','SECAM'));
comment on column public.editions.video_standard is 'Optional video encoding marking from the physical edition, independent of region.';
comment on column public.box_sets.video_standard is 'Optional video encoding marking from the physical box, independent of region.';

-- Optional RPC keys preserve older APKs. Invoker and owner checks remain intact.
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
  new_packaging public.packaging_type;
  new_encoding text;
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
    if k <> all(array['edition_name','publisher','country','region','disc_count','custom_cover_url','back_cover_url','packaging_type','video_standard']) then
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
  if row(new_name,new_publisher,new_country,new_region,new_discs,new_cover,new_back_cover,new_packaging,new_encoding) is not distinct from
     row(original.edition_name,original.publisher,original.country,original.region,original.disc_count,original.custom_cover_url,original.back_cover_url,original.packaging_type,original.video_standard) then
    return original.id;
  end if;
  insert into public.editions(movie_id, barcode, media_format, packaging_type, publisher, region, video_standard, country,
    edition_name, product_image_url, custom_cover_url, back_cover_url, is_special_edition, is_limited_edition, disc_count, release_year)
  values (original.movie_id, original.barcode, original.media_format, new_packaging, new_publisher,
    new_region, new_encoding, new_country, new_name, original.product_image_url, new_cover, new_back_cover, original.is_special_edition,
    original.is_limited_edition, new_discs, original.release_year)
  returning id into replacement;
  update public.collection_items set edition_id=replacement where id=owned.id and user_id=auth.uid();
  return replacement;
end;
$$;
revoke all on function public.edit_collection_edition(uuid,uuid,jsonb) from public, anon;
grant execute on function public.edit_collection_edition(uuid,uuid,jsonb) to authenticated;
comment on function public.edit_collection_edition(uuid,uuid,jsonb) is
  'Atomically clone edition metadata, optional back cover and cover type, relinking only the caller-owned copy. Omitted back_cover_url, packaging_type and video_standard are preserved for older clients.';



create or replace function public.create_collection_box(p_expected_user_id uuid, p_box jsonb, p_movie_ids uuid[], p_copy jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_box uuid;
  v_copy uuid;
begin
  if v_user is null or v_user is distinct from p_expected_user_id then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_box) is distinct from 'object' or jsonb_typeof(p_copy) is distinct from 'object' then
    raise exception 'Dados inválidos.';
  end if;
  if exists (select 1 from jsonb_object_keys(p_box) as fields(key) where key <> all(array['name','barcode','cover_url','media_format','edition_name','publisher','country','region','video_standard','disc_count','is_special_edition','is_limited_edition']))
    or exists (select 1 from jsonb_object_keys(p_copy) as fields(key) where key <> all(array['condition','purchase_price','purchase_date','purchase_place','notes'])) then
    raise exception 'Campos não permitidos.';
  end if;
  if p_box ? 'video_standard' and (jsonb_typeof(p_box->'video_standard') not in ('string','null')
    or p_box->>'video_standard' not in ('NTSC','PAL','PAL-M','SECAM')) then
    raise exception 'Invalid video standard' using errcode='22023';
  end if;
  if p_movie_ids is null or cardinality(p_movie_ids) not between 2 and 100
    or array_position(p_movie_ids, null) is not null
    or (select count(distinct id) from unnest(p_movie_ids) as selected(id)) <> cardinality(p_movie_ids) then
    raise exception 'Selecione de 2 a 100 filmes diferentes.';
  end if;
  insert into public.box_sets(created_by,name,barcode,cover_url,media_format,edition_name,publisher,country,region,video_standard,disc_count,is_special_edition,is_limited_edition)
  values (v_user,btrim(p_box->>'name'),nullif(btrim(p_box->>'barcode'),''),nullif(btrim(p_box->>'cover_url'),''),
    (p_box->>'media_format')::public.media_format,nullif(btrim(p_box->>'edition_name'),''),nullif(btrim(p_box->>'publisher'),''),
    nullif(btrim(p_box->>'country'),''),nullif(btrim(p_box->>'region'),''),p_box->>'video_standard',(p_box->>'disc_count')::integer,
    coalesce((p_box->>'is_special_edition')::boolean,false),coalesce((p_box->>'is_limited_edition')::boolean,false)) returning id into v_box;
  insert into public.box_set_movies(box_set_id,movie_id,position)
    select v_box,id,ordinality::integer from unnest(p_movie_ids) with ordinality as selected(id,ordinality);
  insert into public.collection_boxes(user_id,box_set_id,condition,purchase_price,purchase_date,purchase_place,notes)
  values (v_user,v_box,(p_copy->>'condition')::public.item_condition,(p_copy->>'purchase_price')::numeric,
    (p_copy->>'purchase_date')::date,nullif(btrim(p_copy->>'purchase_place'),''),nullif(btrim(p_copy->>'notes'),'')) returning id into v_copy;
  return v_copy;
end;
$$;
revoke all on function public.create_collection_box(uuid,jsonb,uuid[],jsonb) from public, anon;
grant execute on function public.create_collection_box(uuid,jsonb,uuid[],jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
