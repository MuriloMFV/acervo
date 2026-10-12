begin;
grant usage on schema acervo_private to authenticated;

-- Preserve the existing creation transaction and its validation for older clients.
alter function public.create_collection_box(uuid,jsonb,uuid[],jsonb) rename to create_collection_box_base;
alter function public.create_collection_box_base(uuid,jsonb,uuid[],jsonb) set schema acervo_private;
revoke all on function acervo_private.create_collection_box_base(uuid,jsonb,uuid[],jsonb) from public, anon;
grant execute on function acervo_private.create_collection_box_base(uuid,jsonb,uuid[],jsonb) to authenticated;

create function public.create_collection_box(p_expected_user_id uuid, p_box jsonb, p_movie_ids uuid[], p_copy jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_copy ? 'is_favorite' and jsonb_typeof(p_copy->'is_favorite') is distinct from 'boolean' then
    raise exception 'Invalid favorite' using errcode='22023';
  end if;
  v_id := acervo_private.create_collection_box_base(p_expected_user_id,p_box,p_movie_ids,p_copy - 'is_favorite');
  if coalesce((p_copy->>'is_favorite')::boolean,false) then
    update public.collection_boxes set is_favorite=true where id=v_id and user_id=auth.uid();
  end if;
  return v_id;
end;
$$;
revoke all on function public.create_collection_box(uuid,jsonb,uuid[],jsonb) from public, anon;
grant execute on function public.create_collection_box(uuid,jsonb,uuid[],jsonb) to authenticated;

-- No new table grants: only this private, owner-checked transaction can edit the catalog.
create function acervo_private.update_collection_box(
  p_item_id uuid, p_expected_box_set_id uuid,
  p_expected_box_updated_at timestamptz, p_expected_copy_updated_at timestamptz,
  p_box jsonb, p_movie_ids uuid[], p_copy jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  owned public.collection_boxes%rowtype;
  original public.box_sets%rowtype;
  k text;
  new_cover text;
  object_key text;
begin
  if v_user is null or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if jsonb_typeof(p_box) is distinct from 'object' or jsonb_typeof(p_copy) is distinct from 'object'
    or not (p_box ?& array['name','barcode','cover_url','media_format','edition_name','publisher','country','region','disc_count','is_special_edition','is_limited_edition'])
    or not (p_copy ?& array['condition','purchase_price','purchase_date','purchase_place','notes']) then
    raise exception 'Invalid box fields' using errcode='22023';
  end if;
  for k in select jsonb_object_keys(p_box) loop
    if k <> all(array['name','barcode','cover_url','media_format','edition_name','publisher','country','region','disc_count','is_special_edition','is_limited_edition','video_standard']) then
      raise exception 'Unsupported box field' using errcode='22023';
    end if;
    if k in ('is_special_edition','is_limited_edition') then
      if jsonb_typeof(p_box->k) <> 'boolean' then raise exception 'Invalid flag' using errcode='22023'; end if;
    elsif k = 'disc_count' then
      if jsonb_typeof(p_box->k) not in ('number','null') or (p_box->>k is not null and p_box->>k !~ '^[1-9][0-9]*$') then
        raise exception 'Invalid disc count' using errcode='22023';
      end if;
    elsif jsonb_typeof(p_box->k) not in ('string','null') or length(p_box->>k) > (case when k='cover_url' then 2048 else 200 end) then
      raise exception 'Invalid box text' using errcode='22023';
    end if;
  end loop;
  for k in select jsonb_object_keys(p_copy) loop
    if k <> all(array['condition','purchase_price','purchase_date','purchase_place','notes','is_favorite']) then
      raise exception 'Unsupported copy field' using errcode='22023';
    end if;
    if k='is_favorite' then
      if jsonb_typeof(p_copy->k) <> 'boolean' then raise exception 'Invalid favorite' using errcode='22023'; end if;
    elsif k='purchase_price' then
      if jsonb_typeof(p_copy->k) not in ('number','null') then raise exception 'Invalid price' using errcode='22023'; end if;
    elsif jsonb_typeof(p_copy->k) not in ('string','null') then
      raise exception 'Invalid copy text' using errcode='22023';
    end if;
  end loop;
  if p_movie_ids is null or cardinality(p_movie_ids) not between 2 and 100
    or array_position(p_movie_ids,null) is not null
    or (select count(distinct id) from unnest(p_movie_ids) as selected(id)) <> cardinality(p_movie_ids)
    or (select count(*) from public.movies where id=any(p_movie_ids)) <> cardinality(p_movie_ids) then
    raise exception 'Selecione de 2 a 100 filmes diferentes.' using errcode='22023';
  end if;
  select * into owned from public.collection_boxes where id=p_item_id and user_id=v_user for update;
  if not found then raise exception 'Box not found' using errcode='42501'; end if;
  if owned.box_set_id is distinct from p_expected_box_set_id then
    raise exception 'Box changed; reload before saving' using errcode='40001';
  end if;
  select * into original from public.box_sets where id=owned.box_set_id and created_by=v_user for update;
  if not found then raise exception 'Box not found' using errcode='42501'; end if;
  if p_expected_box_updated_at is null or p_expected_copy_updated_at is null
    or original.updated_at is distinct from p_expected_box_updated_at
    or owned.updated_at is distinct from p_expected_copy_updated_at then
    raise exception 'Box changed; reload before saving' using errcode='40001';
  end if;
  new_cover := nullif(btrim(p_box->>'cover_url'),'');
  -- Old external URLs may be retained. Every newly chosen image is a stored cover.
  if new_cover is not null and new_cover is distinct from original.cover_url then
    object_key := split_part(new_cover,'/storage/v1/object/public/edition-covers/',2);
    if new_cover !~ '^https://[^/?#]+/storage/v1/object/public/edition-covers/'
      or object_key !~ ('^' || v_user::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
      or not exists (select 1 from storage.objects where bucket_id='edition-covers' and name=object_key) then
      raise exception 'Choose a stored box cover' using errcode='22023';
    end if;
  end if;
  update public.box_sets set
    name=btrim(p_box->>'name'), barcode=nullif(btrim(p_box->>'barcode'),''), cover_url=new_cover,
    media_format=(p_box->>'media_format')::public.media_format,
    edition_name=nullif(btrim(p_box->>'edition_name'),''), publisher=nullif(btrim(p_box->>'publisher'),''),
    country=nullif(btrim(p_box->>'country'),''), region=nullif(btrim(p_box->>'region'),''),
    video_standard=case when p_box ? 'video_standard' then p_box->>'video_standard' else original.video_standard end,
    disc_count=(p_box->>'disc_count')::integer,
    is_special_edition=(p_box->>'is_special_edition')::boolean,
    is_limited_edition=(p_box->>'is_limited_edition')::boolean
  where id=original.id and created_by=v_user;
  delete from public.box_set_movies where box_set_id=original.id;
  insert into public.box_set_movies(box_set_id,movie_id,position)
    select original.id,id,ordinality::integer from unnest(p_movie_ids) with ordinality as selected(id,ordinality);
  update public.collection_boxes set
    condition=(p_copy->>'condition')::public.item_condition,
    purchase_price=(p_copy->>'purchase_price')::numeric,
    purchase_date=(p_copy->>'purchase_date')::date,
    purchase_place=nullif(btrim(p_copy->>'purchase_place'),''), notes=nullif(btrim(p_copy->>'notes'),''),
    is_favorite=case when p_copy ? 'is_favorite' then (p_copy->>'is_favorite')::boolean else owned.is_favorite end
  where id=owned.id and user_id=v_user;
  return owned.id;
end;
$$;
revoke all on function acervo_private.update_collection_box(uuid,uuid,timestamptz,timestamptz,jsonb,uuid[],jsonb) from public, anon;
grant execute on function acervo_private.update_collection_box(uuid,uuid,timestamptz,timestamptz,jsonb,uuid[],jsonb) to authenticated;

create function public.edit_collection_box(
  p_item_id uuid, p_expected_box_set_id uuid,
  p_expected_box_updated_at timestamptz, p_expected_copy_updated_at timestamptz,
  p_box jsonb, p_movie_ids uuid[], p_copy jsonb
) returns uuid language sql security invoker set search_path = '' as $$
  select acervo_private.update_collection_box(p_item_id,p_expected_box_set_id,
    p_expected_box_updated_at,p_expected_copy_updated_at,p_box,p_movie_ids,p_copy);
$$;
revoke all on function public.edit_collection_box(uuid,uuid,timestamptz,timestamptz,jsonb,uuid[],jsonb) from public, anon;
grant execute on function public.edit_collection_box(uuid,uuid,timestamptz,timestamptz,jsonb,uuid[],jsonb) to authenticated;
comment on function public.edit_collection_box(uuid,uuid,timestamptz,timestamptz,jsonb,uuid[],jsonb) is
  'Owner-checked atomic edit of the existing BoxSet, ordered BoxSetMovie links and CollectionBox. IDs are preserved; stale versions are rejected.';
comment on table public.box_sets is 'Box físico privado ao criador. Edição apenas por transação com verificação de proprietário; sem UPDATE/DELETE direto pelo app.';
notify pgrst, 'reload schema';
commit;
