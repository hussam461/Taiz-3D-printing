-- Editable storefront benefit cards and the current public brand name.
create table if not exists public.homepage_benefits (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 240),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homepage_benefits enable row level security;

drop policy if exists homepage_benefits_public_read on public.homepage_benefits;
create policy homepage_benefits_public_read on public.homepage_benefits
  for select using (is_published = true or public.is_admin());

drop policy if exists homepage_benefits_admin_write on public.homepage_benefits;
create policy homepage_benefits_admin_write on public.homepage_benefits
  for all using (public.is_admin()) with check (public.is_admin());

grant select on table public.homepage_benefits to anon;
grant select, insert, update, delete on table public.homepage_benefits to authenticated;
grant all privileges on table public.homepage_benefits to service_role;

insert into public.homepage_benefits (title, description, is_published, sort_order)
select defaults.title, defaults.description, true, defaults.sort_order
from (values
  ('جودة طباعة عالية', 'نراجع إعدادات التصنيع وجودة المنتج قبل تسليمه.', 0),
  ('سعر واضح', 'نعرض السعر والخصم بوضوح قبل إتمام الطلب.', 1),
  ('طلب مخصص', 'أرسل فكرتك أو تصميمك لنراجع إمكانية تنفيذه.', 2)
) as defaults(title, description, sort_order)
where not exists (
  select 1 from public.homepage_benefits existing where existing.title = defaults.title
);

-- Upgrade only the original starter name; preserve any name chosen by the store owner.
update public.store_settings
set store_name = 'Taiz 3D Printing', updated_at = now()
where id = 1 and store_name = 'Taiz Printer';

update public.legal_pages
set body = replace(body, 'Taiz Printer', 'Taiz 3D Printing'), updated_at = now()
where body like '%Taiz Printer%';
