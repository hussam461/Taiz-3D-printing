alter table public.store_settings
  add column if not exists all_products_image_path text,
  add column if not exists custom_order_image_path text;
