alter table public.store_settings
  add column if not exists announcement_scope text not null default 'all' check (announcement_scope in ('all', 'home')),
  add column if not exists announcement_button_enabled boolean not null default true;