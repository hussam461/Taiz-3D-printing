-- Add one selectable default delivery area for checkout and admin forms.
alter table public.delivery_areas add column if not exists is_default boolean not null default false;
create unique index if not exists delivery_areas_one_default on public.delivery_areas (is_default) where is_default;
