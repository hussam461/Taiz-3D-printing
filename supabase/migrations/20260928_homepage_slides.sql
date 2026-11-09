-- Homepage carousel: up to eight public slides, editable by admins only.
create table if not exists public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  image_path text,
  image_alt text not null default '',
  title text not null default '',
  description text not null default '',
  href text,
  is_published boolean not null default false,
  sort_order integer not null check (sort_order between 0 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_slides_sort_order_unique unique (sort_order) deferrable initially deferred,
  constraint homepage_slides_published_image check (not is_published or nullif(btrim(image_path), '') is not null),
  constraint homepage_slides_title_length check (char_length(title) <= 120),
  constraint homepage_slides_description_length check (char_length(description) <= 240),
  constraint homepage_slides_alt_length check (char_length(image_alt) <= 200),
  constraint homepage_slides_href_length check (href is null or char_length(href) <= 500)
);

alter table public.homepage_slides enable row level security;

drop policy if exists homepage_slides_public_read on public.homepage_slides;
create policy homepage_slides_public_read on public.homepage_slides
  for select using (is_published = true or public.is_admin());

drop policy if exists homepage_slides_admin_write on public.homepage_slides;
create policy homepage_slides_admin_write on public.homepage_slides
  for all using (public.is_admin()) with check (public.is_admin());

grant select on table public.homepage_slides to anon;
grant select, insert, update, delete on table public.homepage_slides to authenticated;
grant all privileges on table public.homepage_slides to service_role;

create or replace function public.admin_reorder_homepage_slides(p_slide_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  slide_count integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if coalesce(cardinality(p_slide_ids), 0) > 8 then
    raise exception 'too many slides';
  end if;
  if cardinality(p_slide_ids) <> (select count(distinct id) from unnest(p_slide_ids) as ids(id)) then
    raise exception 'duplicate slide ids';
  end if;
  select count(*) into slide_count from public.homepage_slides;
  if slide_count <> coalesce(cardinality(p_slide_ids), 0)
    or slide_count <> (select count(*) from public.homepage_slides where id = any(coalesce(p_slide_ids, array[]::uuid[]))) then
    raise exception 'slide list changed';
  end if;
  set constraints homepage_slides_sort_order_unique deferred;
  update public.homepage_slides as slides
  set sort_order = ordered.ordinality - 1,
      updated_at = now()
  from unnest(p_slide_ids) with ordinality as ordered(id, ordinality)
  where slides.id = ordered.id;
end;
$$;
revoke all on function public.admin_reorder_homepage_slides(uuid[]) from public, anon;
grant execute on function public.admin_reorder_homepage_slides(uuid[]) to authenticated;
