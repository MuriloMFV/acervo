begin;

-- A TMDB work snapshot, independent of the physical collection/catalog.
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id bigint not null check (tmdb_id > 0 and tmdb_id <= 9007199254740991),
  title text not null check (length(btrim(title)) between 1 and 500),
  release_year smallint check (release_year between 1000 and 9999),
  poster_url text check (poster_url is null or (length(poster_url) <= 2048 and poster_url ~* '^https?://[^[:space:]]+$')),
  desired_format text not null default 'ANY' check (desired_format in ('DVD','BLURAY','UHD_4K','VHS','ANY')),
  priority text not null default 'MEDIUM' check (priority in ('HIGH','MEDIUM','LOW')),
  status text not null default 'LOOKING' check (status in ('LOOKING','FOUND','ACQUIRED')),
  target_price numeric(12,2) check (target_price >= 0 and target_price <> 'NaN'::numeric),
  notes text check (length(notes) <= 4000),
  listing_url text check (listing_url is null or (length(listing_url) <= 2048 and listing_url ~* '^https?://[^[:space:]]+$')),
  duplicate_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wishlist_items_user_created_idx on public.wishlist_items(user_id,created_at desc,id desc);
create index wishlist_items_user_tmdb_idx on public.wishlist_items(user_id,tmdb_id);
create unique index wishlist_items_unconfirmed_unique on public.wishlist_items(user_id,tmdb_id) where not duplicate_confirmed;

-- Serialize same-owner/same-work creation, including already-confirmed duplicates.
-- RLS stays active; this function never reads another user's wishlist.
create function acervo_private.guard_wishlist_duplicate()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id = (select auth.uid()) then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text || ':' || new.tmdb_id::text,0));
    if not new.duplicate_confirmed and exists (
      select 1 from public.wishlist_items w where w.user_id = new.user_id and w.tmdb_id = new.tmdb_id
    ) then
      raise exception 'Este filme já está na sua lista de desejos.' using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function acervo_private.guard_wishlist_duplicate() from public,anon,authenticated;
create trigger wishlist_items_duplicate before insert on public.wishlist_items
  for each row execute function acervo_private.guard_wishlist_duplicate();
create trigger wishlist_items_updated_at before update on public.wishlist_items
  for each row execute function acervo_private.set_updated_at();

alter table public.wishlist_items enable row level security;
revoke all on public.wishlist_items from public,anon,authenticated;
grant select,insert,delete on public.wishlist_items to authenticated;
-- Movie/owner/confirmation metadata cannot be reassigned by an edit.
grant update(desired_format,priority,status,target_price,notes,listing_url) on public.wishlist_items to authenticated;
create policy wishlist_items_select_own on public.wishlist_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy wishlist_items_insert_own on public.wishlist_items for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy wishlist_items_update_own on public.wishlist_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy wishlist_items_delete_own on public.wishlist_items for delete to authenticated
  using (user_id = (select auth.uid()));
comment on column public.wishlist_items.duplicate_confirmed is 'True only after the user explicitly confirms adding another wish for the same TMDB work.';
notify pgrst,'reload schema';
commit;
