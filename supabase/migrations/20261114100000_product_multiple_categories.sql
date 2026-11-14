-- Allow one product to belong to several storefront categories.
create table if not exists public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create index if not exists product_categories_category_idx
  on public.product_categories (category_id, product_id);

insert into public.product_categories (product_id, category_id, sort_order)
select id, category_id, 0
from public.products
on conflict (product_id, category_id) do nothing;

alter table public.product_categories enable row level security;
grant select on public.product_categories to anon, authenticated;

drop policy if exists product_categories_public_read on public.product_categories;
create policy product_categories_public_read on public.product_categories for select using (
  public.is_admin() or exists (
    select 1
    from public.products p
    join public.categories c on c.id = product_categories.category_id
    where p.id = product_categories.product_id
      and p.is_active
      and c.is_active
  )
);

drop policy if exists product_categories_admin_write on public.product_categories;
create policy product_categories_admin_write on public.product_categories for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_set_product_categories(p_product_id uuid, p_category_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_category_ids is null or cardinality(p_category_ids) = 0 or array_position(p_category_ids, null) is not null then
    raise exception 'at least one category is required';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then raise exception 'product not found'; end if;
  if exists (
    select 1
    from unnest(p_category_ids) as selected(category_id)
    left join public.categories c on c.id = selected.category_id
    where c.id is null
  ) then raise exception 'category not found'; end if;

  update public.products set category_id = p_category_ids[1], updated_at = now() where id = p_product_id;
  delete from public.product_categories where product_id = p_product_id;
  insert into public.product_categories (product_id, category_id, sort_order)
  select p_product_id, selected.category_id, (selected.ordinality - 1)::integer
  from (
    select distinct on (category_id) category_id, ordinality
    from unnest(p_category_ids) with ordinality as input(category_id, ordinality)
    order by category_id, ordinality
  ) as selected
  order by selected.ordinality;
end;
$$;

revoke all on function public.admin_set_product_categories(uuid, uuid[]) from public, anon;
grant execute on function public.admin_set_product_categories(uuid, uuid[]) to authenticated;

create or replace function public.admin_get_category_product_counts()
returns table(category_id uuid, product_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select pc.category_id, count(*)
    from public.product_categories pc
    group by pc.category_id;
end;
$$;

revoke all on function public.admin_get_category_product_counts() from public, anon;
grant execute on function public.admin_get_category_product_counts() to authenticated;

create or replace function public.storefront_product_ids_by_category_name(p_term text)
returns table(product_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct pc.product_id
  from public.categories c
  join public.product_categories pc on pc.category_id = c.id
  join public.products p on p.id = pc.product_id
  where c.is_active
    and p.is_active
    and c.name ilike ('%' || p_term || '%');
$$;

revoke all on function public.storefront_product_ids_by_category_name(text) from public;
grant execute on function public.storefront_product_ids_by_category_name(text) to anon, authenticated;
