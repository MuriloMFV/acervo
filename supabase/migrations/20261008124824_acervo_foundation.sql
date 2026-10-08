begin;

create type public.media_format as enum ('DVD', 'BLURAY', 'UHD_4K', 'VHS');
create type public.packaging_type as enum ('STANDARD', 'STEELBOOK', 'DIGIPAK', 'BOX');
create type public.item_condition as enum ('SEALED', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'FAIR');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id bigint unique check (tmdb_id > 0),
  title text not null check (length(btrim(title)) > 0),
  original_title text,
  release_year smallint check (release_year between 1000 and 9999),
  overview text,
  runtime integer check (runtime > 0),
  poster_url text,
  backdrop_url text,
  director text,
  genres text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete restrict,
  barcode text check (barcode is null or (barcode = btrim(barcode) and length(barcode) > 0)),
  media_format public.media_format not null,
  packaging_type public.packaging_type not null default 'STANDARD',
  publisher text,
  region text,
  country text,
  edition_name text,
  product_image_url text,
  custom_cover_url text,
  is_special_edition boolean not null default false,
  is_limited_edition boolean not null default false,
  disc_count integer check (disc_count > 0),
  release_year smallint check (release_year between 1000 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  edition_id uuid not null references public.editions(id) on delete restrict,
  condition public.item_condition not null,
  purchase_price numeric(12, 2) check (purchase_price >= 0 and purchase_price <> 'NaN'::numeric),
  purchase_date date,
  purchase_place text,
  is_favorite boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.movies.poster_url is 'Poster da obra, sem dados da edição física.';
comment on column public.editions.product_image_url is 'Imagem comercial da edição física.';
comment on column public.editions.custom_cover_url is 'Capa específica da edição; prioridade futura: custom_cover_url, product_image_url, movies.poster_url.';

-- FKs and ownership queries; barcode is deliberately non-unique in this phase.
create index editions_movie_id_idx on public.editions(movie_id);
create index editions_barcode_idx on public.editions(barcode) where barcode is not null;
create index collection_items_user_id_idx on public.collection_items(user_id);
create index collection_items_edition_id_idx on public.collection_items(edition_id);

-- Internal trigger functions are not exposed as Data API RPCs.
create schema if not exists acervo_private;
revoke all on schema acervo_private from public, anon, authenticated;

create function acervo_private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function acervo_private.set_updated_at() from public, anon, authenticated;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function acervo_private.set_updated_at();
create trigger movies_updated_at before update on public.movies
  for each row execute function acervo_private.set_updated_at();
create trigger editions_updated_at before update on public.editions
  for each row execute function acervo_private.set_updated_at();
create trigger collection_items_updated_at before update on public.collection_items
  for each row execute function acervo_private.set_updated_at();

-- Elevated only to create the new user's own profile from the auth trigger.
-- Editable metadata is used for display, never for authorization.
create function acervo_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, case
    when pg_catalog.jsonb_typeof(new.raw_user_meta_data -> 'display_name') = 'string'
      then pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name')
    else '' end);
  return new;
end;
$$;
revoke all on function acervo_private.handle_new_user() from public, anon, authenticated;
create trigger acervo_auth_user_created after insert on auth.users
  for each row execute function acervo_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.editions enable row level security;
alter table public.collection_items enable row level security;

-- Explicit grants, independent of the project's default Data API privileges.
revoke all on public.profiles, public.movies, public.editions, public.collection_items
  from public, anon, authenticated;
grant usage on schema public to authenticated;
grant usage on type public.media_format, public.packaging_type, public.item_condition to authenticated;
grant select, insert, update, delete on public.profiles, public.collection_items to authenticated;
grant select, insert on public.movies, public.editions to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

create policy movies_read_authenticated on public.movies for select to authenticated
  using ((select auth.uid()) is not null);
create policy movies_create_authenticated on public.movies for insert to authenticated
  with check ((select auth.uid()) is not null);
create policy editions_read_authenticated on public.editions for select to authenticated
  using ((select auth.uid()) is not null);
create policy editions_create_authenticated on public.editions for insert to authenticated
  with check ((select auth.uid()) is not null);
-- No app-facing UPDATE/DELETE grant or policy for the shared catalog.

create policy collection_items_select_own on public.collection_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy collection_items_insert_own on public.collection_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy collection_items_update_own on public.collection_items for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy collection_items_delete_own on public.collection_items for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
