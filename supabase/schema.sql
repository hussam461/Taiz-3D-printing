-- Taiz Printer schema. Run in Supabase SQL editor after creating the project.
-- Enable required extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum (
    'pending',
    'confirmed',
    'in_production',
    'ready',
    'shipped',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'unpaid',
    'proof_pending',
    'proof_approved',
    'proof_rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.proof_status as enum (
    'pending',
    'approved',
    'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_currency as enum (
    'OLD_YER',
    'NEW_YER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_role as enum ('admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Admin profiles (no password storage; Auth is source of truth)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'admin',
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  name text not null,
  slug text not null unique,
  description text not null default '',
  base_price_old_yer numeric(14, 0) not null check (base_price_old_yer >= 0),
  discount_percent numeric(5, 2) check (discount_percent is null or (discount_percent > 0 and discount_percent <= 100)),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  specifications jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_slug_idx on public.products (slug);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_created_idx on public.products (created_at desc);
create index if not exists products_featured_idx on public.products (is_featured) where is_featured and is_active;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists product_images_one_main
  on public.product_images (product_id)
  where is_main;

-- ---------------------------------------------------------------------------
-- Global options
-- ---------------------------------------------------------------------------
create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex_code text not null default '#64748b' check (hex_code ~ '^#[0-9A-Fa-f]{6}$'),
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create unique index if not exists colors_one_default on public.colors (is_default) where is_default;
create unique index if not exists materials_one_default on public.materials (is_default) where is_default;

-- ---------------------------------------------------------------------------
-- Delivery
-- ---------------------------------------------------------------------------
create table if not exists public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  governorate text not null,
  city_area text,
  fee_old_yer numeric(14, 0) not null check (fee_old_yer >= 0),
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists delivery_areas_one_default on public.delivery_areas (is_default) where is_default;

create table if not exists public.free_delivery_settings (
  id smallint primary key default 1 check (id = 1),
  is_enabled boolean not null default false,
  min_order_value_old_yer numeric(14, 0) not null check (min_order_value_old_yer >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Currencies and exchange
-- ---------------------------------------------------------------------------
create table if not exists public.currencies (
  code public.payment_currency primary key,
  name text not null,
  is_enabled boolean not null default true,
  display_order integer not null default 0,
  rounding_mode text not null default 'nearest_integer'
    check (rounding_mode = 'nearest_integer')
);

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  new_rial_per_old_rial numeric(18, 6) not null check (new_rial_per_old_rial > 0),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

-- ---------------------------------------------------------------------------
-- Payment accounts
-- ---------------------------------------------------------------------------
create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_number text not null,
  currency_code public.payment_currency not null,
  instructions text not null default '',
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.prevent_zero_active_payment_accounts()
returns trigger
language plpgsql
as $$
declare
  remaining integer;
begin
  if (tg_op = 'DELETE' and old.is_active) or (tg_op = 'UPDATE' and old.is_active and (not new.is_active or new is distinct from old) and (tg_op = 'DELETE' or not new.is_active)) then
    select count(*) into remaining
    from public.payment_accounts
    where is_active = true
      and id is distinct from old.id;
    if remaining < 1 then
      raise exception 'يجب الإبقاء على حساب دفع نشط واحد على الأقل';
    end if;
  end if;
  if tg_op = 'DELETE' then
    select count(*) into remaining from public.payment_accounts where id is distinct from old.id;
    if remaining < 1 then
      raise exception 'لا يمكن حذف الحساب الأخير';
    end if;
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists payment_accounts_keep_one on public.payment_accounts;
create trigger payment_accounts_keep_one
before update or delete on public.payment_accounts
for each row execute function public.prevent_zero_active_payment_accounts();

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Taiz 3D Printing',
  logo_path text,
  description text not null default '',
  hero_headline text not null default '',
  hero_description text not null default '',
  deposit_percent numeric(5, 2) not null default 30 check (deposit_percent > 0 and deposit_percent <= 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_settings (
  id smallint primary key default 1 check (id = 1),
  phone text,
  whatsapp text,
  instagram text,
  email text,
  updated_at timestamptz not null default now()
);

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true
);

create table if not exists public.homepage_benefits (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 240),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_pages (
  slug text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);

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

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_governorate text not null,
  delivery_city_area text,
  delivery_address text not null,
  delivery_notes text,
  delivery_area_id uuid,
  snapshot_delivery jsonb not null,
  snapshot_currency jsonb not null,
  snapshot_payment_account jsonb not null,
  snapshot_free_delivery jsonb not null,
  subtotal_old_yer numeric(14, 0) not null check (subtotal_old_yer >= 0),
  discount_total_old_yer numeric(14, 0) not null check (discount_total_old_yer >= 0),
  delivery_fee_old_yer numeric(14, 0) not null check (delivery_fee_old_yer >= 0),
  free_delivery_applied boolean not null default false,
  final_total_old_yer numeric(14, 0) not null check (final_total_old_yer >= 0),
  deposit_percent numeric(5, 2) not null,
  deposit_old_yer numeric(14, 0) not null check (deposit_old_yer >= 0),
  remaining_old_yer numeric(14, 0) not null check (remaining_old_yer >= 0),
  payment_currency public.payment_currency not null,
  payable_total numeric(14, 0) not null,
  payable_deposit numeric(14, 0) not null,
  payable_remaining numeric(14, 0) not null,
  balance_status text not null default 'due' check (balance_status in ('not_due', 'due', 'paid', 'legacy_untracked')),
  balance_paid_at timestamptz,
  balance_paid_by uuid references auth.users (id),
  order_status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'proof_pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_paid_balance_audit_check
    check (balance_status <> 'paid' or remaining_old_yer = 0 or (balance_paid_at is not null and balance_paid_by is not null)),
  constraint orders_balance_amount_state_check
    check ((balance_status <> 'due' or remaining_old_yer > 0) and (balance_status <> 'not_due' or remaining_old_yer = 0))
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (order_status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_balance_due_idx on public.orders (created_at desc) where balance_status = 'due';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid,
  snapshot jsonb not null,
  quantity integer not null check (quantity > 0),
  unit_base_price_old_yer numeric(14, 0) not null check (unit_base_price_old_yer >= 0),
  discount_percent numeric(5, 2),
  unit_final_price_old_yer numeric(14, 0) not null check (unit_final_price_old_yer >= 0),
  line_total_old_yer numeric(14, 0) not null check (line_total_old_yer >= 0),
  color_name text not null,
  material_name text not null
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0),
  status public.proof_status not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists payment_proofs_status_idx on public.payment_proofs (status);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_idx on public.activity_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.colors enable row level security;
alter table public.materials enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.free_delivery_settings enable row level security;
alter table public.currencies enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.store_settings enable row level security;
alter table public.contact_settings enable row level security;
alter table public.faq_items enable row level security;
alter table public.legal_pages enable row level security;
alter table public.homepage_slides enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.order_status_history enable row level security;
alter table public.activity_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.guard_order_balance_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.balance_status is distinct from old.balance_status
    and not (
      old.balance_status = 'due'
      and new.balance_status = 'paid'
      and current_setting('app.balance_payment_rpc', true) = 'true'
    ) then
    raise exception 'balance status can only be changed by the balance payment action';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_balance_status on public.orders;
create trigger orders_guard_balance_status
  before update of balance_status on public.orders
  for each row execute function public.guard_order_balance_status();

drop trigger if exists orders_require_balance_before_shipping on public.orders;
drop function if exists public.guard_order_shipping_balance();
create or replace function public.guard_order_delivery_balance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_status = 'shipped'
    and old.order_status is distinct from 'shipped'
    and new.payment_status <> 'proof_approved' then
    raise exception 'deposit proof is not approved';
  end if;
  if new.order_status = 'completed'
    and old.order_status is distinct from 'completed'
    and new.remaining_old_yer > 0
    and new.balance_status = 'due'
    and current_setting('app.balance_payment_rpc', true) is distinct from 'true' then
    raise exception 'remaining balance must be recorded at delivery';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_require_balance_before_completion on public.orders;
create trigger orders_require_balance_before_completion
  before update of order_status on public.orders
  for each row execute function public.guard_order_delivery_balance();

drop function if exists public.admin_record_order_balance_payment(uuid);
create or replace function public.admin_complete_order_delivery(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  completion_note text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if current_order.order_status not in ('ready', 'shipped') then raise exception 'order is not ready for delivery'; end if;
  if current_order.payment_status <> 'proof_approved' then raise exception 'deposit proof is not approved'; end if;
  if current_order.balance_status = 'due' then
    if current_order.remaining_old_yer <= 0 then raise exception 'no tracked balance'; end if;
    perform set_config('app.balance_payment_rpc', 'true', true);
    update public.orders
    set order_status = 'completed', balance_status = 'paid', balance_paid_at = now(), balance_paid_by = auth.uid(), updated_at = now()
    where id = p_order_id;
    completion_note := 'تم تسليم الطلب وتحصيل المبلغ المتبقي';
  elsif current_order.balance_status in ('not_due', 'paid', 'legacy_untracked') then
    update public.orders set order_status = 'completed', updated_at = now() where id = p_order_id;
    completion_note := case
      when current_order.balance_status = 'legacy_untracked' then 'تم تسليم الطلب؛ حالة المتبقي التاريخية غير محددة'
      when current_order.balance_status = 'paid' then 'تم تسليم الطلب؛ سبق تسجيل تحصيل المتبقي'
      else 'تم تسليم الطلب ولا يوجد مبلغ متبقٍ'
    end;
  else
    raise exception 'no tracked balance';
  end if;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, current_order.order_status, 'completed', auth.uid(), completion_note);
end;
$$;

revoke all on function public.admin_complete_order_delivery(uuid) from public, anon;
grant execute on function public.admin_complete_order_delivery(uuid) to authenticated;
create or replace function public.admin_review_order_payment_proof(
  p_proof_id uuid,
  p_decision text,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_proof public.payment_proofs%rowtype;
  current_order public.orders%rowtype;
  next_status public.order_status;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then raise exception 'invalid decision'; end if;
  if p_decision = 'rejected' and nullif(btrim(p_reason), '') is null then
    raise exception 'rejection reason required';
  end if;
  select * into current_proof from public.payment_proofs where id = p_proof_id for update;
  if not found then raise exception 'proof not found'; end if;
  if current_proof.status <> 'pending' then raise exception 'proof already reviewed'; end if;
  select * into current_order from public.orders where id = current_proof.order_id for update;
  if not found then raise exception 'order not found'; end if;
  if p_decision = 'approved' and current_order.order_status in ('completed', 'cancelled') then
    raise exception 'order is closed';
  end if;
  update public.payment_proofs
  set status = p_decision::public.proof_status,
      rejection_reason = case when p_decision = 'rejected' then btrim(p_reason) else null end,
      reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_proof_id;
  next_status := current_order.order_status;
  if p_decision = 'approved' and current_order.order_status in ('pending', 'confirmed') then
    next_status := 'in_production';
  end if;
  update public.orders
  set payment_status = case
        when p_decision = 'approved' then 'proof_approved'::public.payment_status
        when payment_status = 'proof_approved' then payment_status
        else 'proof_rejected'::public.payment_status
      end,
      order_status = next_status,
      updated_at = now()
  where id = current_order.id;
  if next_status is distinct from current_order.order_status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
    values (current_order.id, current_order.order_status, next_status, auth.uid(), 'تم اعتماد إثبات العربون وبدأ تجهيز الطلب');
  end if;
end;
$$;

revoke all on function public.admin_review_order_payment_proof(uuid, text, text) from public, anon;
grant execute on function public.admin_review_order_payment_proof(uuid, text, text) to authenticated;

revoke all on function public.guard_order_balance_status() from public, anon, authenticated;
revoke all on function public.guard_order_delivery_balance() from public, anon, authenticated;

-- Public read of storefront data
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (is_active = true or public.is_admin());
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (is_active = true or public.is_admin());
drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin()))
);
drop policy if exists colors_public_read on public.colors;
create policy colors_public_read on public.colors for select using (is_active = true or public.is_admin());
drop policy if exists materials_public_read on public.materials;
create policy materials_public_read on public.materials for select using (is_active = true or public.is_admin());
drop policy if exists delivery_public_read on public.delivery_areas;
create policy delivery_public_read on public.delivery_areas for select using (is_active = true or public.is_admin());
drop policy if exists free_delivery_public_read on public.free_delivery_settings;
create policy free_delivery_public_read on public.free_delivery_settings for select using (true);
drop policy if exists currencies_public_read on public.currencies;
create policy currencies_public_read on public.currencies for select using (is_enabled = true or public.is_admin());
drop policy if exists exchange_public_read on public.exchange_rates;
create policy exchange_public_read on public.exchange_rates for select using (true);
drop policy if exists payment_accounts_public_read on public.payment_accounts;
create policy payment_accounts_public_read on public.payment_accounts for select using (is_active = true or public.is_admin());
drop policy if exists store_settings_public_read on public.store_settings;
create policy store_settings_public_read on public.store_settings for select using (true);
drop policy if exists contact_settings_public_read on public.contact_settings;
create policy contact_settings_public_read on public.contact_settings for select using (true);
drop policy if exists faq_public_read on public.faq_items;
create policy faq_public_read on public.faq_items for select using (is_published = true or public.is_admin());
drop policy if exists homepage_benefits_public_read on public.homepage_benefits;
create policy homepage_benefits_public_read on public.homepage_benefits for select using (is_published = true or public.is_admin());
drop policy if exists legal_public_read on public.legal_pages;
create policy legal_public_read on public.legal_pages for select using (true);
drop policy if exists homepage_slides_public_read on public.homepage_slides;
create policy homepage_slides_public_read on public.homepage_slides for select using (is_published = true or public.is_admin());

-- Customer/order records are private; admin access is limited to the actions used by the console.
drop policy if exists orders_admin_all on public.orders;
drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders for select using (public.is_admin());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists order_items_admin_all on public.order_items;
drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items for select using (public.is_admin());
drop policy if exists proofs_admin_all on public.payment_proofs;
drop policy if exists proofs_admin_read on public.payment_proofs;
create policy proofs_admin_read on public.payment_proofs for select using (public.is_admin());
drop policy if exists proofs_admin_update on public.payment_proofs;
create policy proofs_admin_update on public.payment_proofs for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists history_admin_all on public.order_status_history;
drop policy if exists history_admin_read on public.order_status_history;
create policy history_admin_read on public.order_status_history for select using (public.is_admin());
drop policy if exists history_admin_insert on public.order_status_history;
create policy history_admin_insert on public.order_status_history for insert with check (public.is_admin());
drop policy if exists activity_admin_all on public.activity_logs;
drop policy if exists activity_admin_read on public.activity_logs;
create policy activity_admin_read on public.activity_logs for select using (public.is_admin());
drop policy if exists activity_admin_insert on public.activity_logs;
create policy activity_admin_insert on public.activity_logs for insert with check (public.is_admin());
drop policy if exists admin_profiles_self on public.admin_profiles;
create policy admin_profiles_self on public.admin_profiles for select using (user_id = auth.uid() or public.is_admin());

-- Admin writes
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists product_images_admin_write on public.product_images;
create policy product_images_admin_write on public.product_images for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists colors_admin_write on public.colors;
create policy colors_admin_write on public.colors for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists materials_admin_write on public.materials;
create policy materials_admin_write on public.materials for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists delivery_admin_write on public.delivery_areas;
create policy delivery_admin_write on public.delivery_areas for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists free_delivery_admin_write on public.free_delivery_settings;
create policy free_delivery_admin_write on public.free_delivery_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists currencies_admin_write on public.currencies;
create policy currencies_admin_write on public.currencies for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists exchange_admin_write on public.exchange_rates;
create policy exchange_admin_write on public.exchange_rates for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists payment_accounts_admin_write on public.payment_accounts;
create policy payment_accounts_admin_write on public.payment_accounts for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists store_settings_admin_write on public.store_settings;
create policy store_settings_admin_write on public.store_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists contact_settings_admin_write on public.contact_settings;
create policy contact_settings_admin_write on public.contact_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists faq_admin_write on public.faq_items;
create policy faq_admin_write on public.faq_items for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists homepage_benefits_admin_write on public.homepage_benefits;
create policy homepage_benefits_admin_write on public.homepage_benefits for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists legal_admin_write on public.legal_pages;
create policy legal_admin_write on public.legal_pages for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists homepage_slides_admin_write on public.homepage_slides;
create policy homepage_slides_admin_write on public.homepage_slides for all using (public.is_admin()) with check (public.is_admin());

-- Explicit API grants are required because this project disables automatic exposure of new tables.
grant usage on schema public to anon, authenticated, service_role;
grant select on table
  public.categories, public.products, public.product_images, public.colors, public.materials,
  public.delivery_areas, public.free_delivery_settings, public.currencies, public.exchange_rates,
  public.payment_accounts, public.store_settings, public.contact_settings, public.faq_items, public.homepage_benefits,
  public.legal_pages, public.homepage_slides
to anon;
grant select, insert, update, delete on table
  public.categories, public.products, public.product_images, public.colors, public.materials,
  public.delivery_areas, public.free_delivery_settings, public.currencies, public.exchange_rates,
  public.payment_accounts, public.store_settings, public.contact_settings, public.faq_items, public.homepage_benefits,
  public.legal_pages, public.homepage_slides
to authenticated;
grant select, update on table public.orders to authenticated;
grant select on table public.order_items, public.admin_profiles to authenticated;
grant select, update on table public.payment_proofs to authenticated;
grant select, insert on table public.order_status_history, public.activity_logs to authenticated;
grant all privileges on all tables in schema public to service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

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

-- Storage buckets and policies. Product media is public; payment proofs remain private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('store-assets', 'store-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('payment-proofs', 'payment-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]),
  ('custom-order-files', 'custom-order-files', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'model/stl']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists store_assets_public_read on storage.objects;
create policy store_assets_public_read on storage.objects
  for select using (bucket_id = 'store-assets');

drop policy if exists product_images_admin_write on storage.objects;
create policy product_images_admin_write on storage.objects
  for all using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists store_assets_admin_write on storage.objects;
create policy store_assets_admin_write on storage.objects
  for all using (bucket_id = 'store-assets' and public.is_admin())
  with check (bucket_id = 'store-assets' and public.is_admin());

drop policy if exists payment_proofs_admin_access on storage.objects;
create policy payment_proofs_admin_access on storage.objects
  for all using (bucket_id = 'payment-proofs' and public.is_admin())
  with check (bucket_id = 'payment-proofs' and public.is_admin());

drop policy if exists custom_order_files_admin_access on storage.objects;
create policy custom_order_files_admin_access on storage.objects
  for all using (bucket_id = 'custom-order-files' and public.is_admin())
  with check (bucket_id = 'custom-order-files' and public.is_admin());
