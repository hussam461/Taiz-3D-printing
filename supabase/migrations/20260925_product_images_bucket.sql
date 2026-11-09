-- Taiz Printer: product image storage setup
-- Run this once in the Supabase SQL Editor for the connected project.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_admin_write on storage.objects;
create policy product_images_admin_write on storage.objects
  for all using (
    bucket_id = 'product-images' and public.is_admin()
  ) with check (
    bucket_id = 'product-images' and public.is_admin()
  );

-- Ensure the application table policies exist as well.
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_images_admin_write on public.product_images;
create policy product_images_admin_write on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());
