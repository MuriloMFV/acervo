begin;

-- A physical box is independent of an Edition with packaging_type = BOX.
-- Initial box catalog is private to its creator; no shared editing/governance.
create table public.box_sets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  barcode text check (barcode is null or barcode ~ '^(\d{8}|\d{12}|\d{13})$'),
  cover_url text check (cover_url is null or (length(cover_url) <= 2048 and cover_url ~* '^https?://[^[:space:]]+$')),
  media_format public.media_format not null,
  edition_name text check (length(edition_name) <= 200),
  publisher text check (length(publisher) <= 200),
  country text check (length(country) <= 200),
  region text check (length(region) <= 200),
  disc_count integer check (disc_count > 0),
  is_special_edition boolean not null default false,
  is_limited_edition boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.box_set_movies (
  box_set_id uuid not null references public.box_sets(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete restrict,
  position integer not null check (position between 1 and 100),
  primary key (box_set_id, movie_id),
  unique (box_set_id, position)
);
create table public.collection_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  box_set_id uuid not null references public.box_sets(id) on delete cascade,
  condition public.item_condition not null,
  purchase_price numeric(12,2) check (purchase_price >= 0 and purchase_price <> 'NaN'::numeric),
  purchase_date date,
  purchase_place text,
  notes text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index box_sets_created_by_idx on public.box_sets(created_by);
create index box_sets_barcode_idx on public.box_sets(barcode) where barcode is not null;
create index box_set_movies_movie_id_idx on public.box_set_movies(movie_id);
create index collection_boxes_user_created_idx on public.collection_boxes(user_id, created_at desc, id desc);
create index collection_boxes_box_set_id_idx on public.collection_boxes(box_set_id);
create trigger box_sets_updated_at before update on public.box_sets
  for each row execute function acervo_private.set_updated_at();
create trigger collection_boxes_updated_at before update on public.collection_boxes
  for each row execute function acervo_private.set_updated_at();

alter table public.box_sets enable row level security;
alter table public.box_set_movies enable row level security;
alter table public.collection_boxes enable row level security;
revoke all on public.box_sets, public.box_set_movies, public.collection_boxes from public, anon, authenticated;
grant select, insert on public.box_sets, public.box_set_movies to authenticated;
grant select, insert, update, delete on public.collection_boxes to authenticated;
create policy box_sets_select_own on public.box_sets for select to authenticated
  using (created_by = (select auth.uid()));
create policy box_sets_insert_own on public.box_sets for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy box_set_movies_select_own on public.box_set_movies for select to authenticated
  using (exists (select 1 from public.box_sets b where b.id = box_set_id and b.created_by = (select auth.uid())));
create policy box_set_movies_insert_own on public.box_set_movies for insert to authenticated
  with check (exists (select 1 from public.box_sets b where b.id = box_set_id and b.created_by = (select auth.uid())));
create policy collection_boxes_select_own on public.collection_boxes for select to authenticated
  using (user_id = (select auth.uid()));
create policy collection_boxes_insert_own on public.collection_boxes for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.box_sets b where b.id = box_set_id and b.created_by = (select auth.uid()))
    and (select count(*) from public.box_set_movies bm where bm.box_set_id = collection_boxes.box_set_id) >= 2);
create policy collection_boxes_update_own on public.collection_boxes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.box_sets b where b.id = box_set_id and b.created_by = (select auth.uid()))
    and (select count(*) from public.box_set_movies bm where bm.box_set_id = collection_boxes.box_set_id) >= 2);
create policy collection_boxes_delete_own on public.collection_boxes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Invoker keeps RLS active. All three inserts commit together or roll back together.
create function public.create_collection_box(p_expected_user_id uuid, p_box jsonb, p_movie_ids uuid[], p_copy jsonb)
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
  if exists (select 1 from jsonb_object_keys(p_box) as fields(key) where key <> all(array['name','barcode','cover_url','media_format','edition_name','publisher','country','region','disc_count','is_special_edition','is_limited_edition']))
    or exists (select 1 from jsonb_object_keys(p_copy) as fields(key) where key <> all(array['condition','purchase_price','purchase_date','purchase_place','notes'])) then
    raise exception 'Campos não permitidos.';
  end if;
  if p_movie_ids is null or cardinality(p_movie_ids) not between 2 and 100
    or array_position(p_movie_ids, null) is not null
    or (select count(distinct id) from unnest(p_movie_ids) as selected(id)) <> cardinality(p_movie_ids) then
    raise exception 'Selecione de 2 a 100 filmes diferentes.';
  end if;
  insert into public.box_sets(created_by,name,barcode,cover_url,media_format,edition_name,publisher,country,region,disc_count,is_special_edition,is_limited_edition)
  values (v_user,btrim(p_box->>'name'),nullif(btrim(p_box->>'barcode'),''),nullif(btrim(p_box->>'cover_url'),''),
    (p_box->>'media_format')::public.media_format,nullif(btrim(p_box->>'edition_name'),''),nullif(btrim(p_box->>'publisher'),''),
    nullif(btrim(p_box->>'country'),''),nullif(btrim(p_box->>'region'),''),(p_box->>'disc_count')::integer,
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
comment on table public.box_sets is 'Box físico privado ao criador nesta versão. Não é Movie nem Edition; sem UPDATE/DELETE do catálogo pelo app.';
comment on table public.collection_boxes is 'Uma cópia de box conta como um único item físico, independentemente dos filmes incluídos.';
notify pgrst, 'reload schema';
commit;
