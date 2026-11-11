alter table public.store_settings
  add column if not exists announcement_enabled boolean not null default true,
  add column if not exists announcement_text text not null default 'عروض جديدة ومنتجات مميزة بانتظارك',
  add column if not exists announcement_button_label text not null default 'تسوق الآن',
  add column if not exists announcement_href text not null default '/products';