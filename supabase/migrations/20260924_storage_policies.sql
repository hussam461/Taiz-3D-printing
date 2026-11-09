-- Re-runnable Storage setup for Taiz Printer.
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