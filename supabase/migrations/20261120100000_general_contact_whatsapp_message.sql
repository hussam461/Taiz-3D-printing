alter table public.contact_settings
  add column if not exists whatsapp_message text not null
  default 'السلام عليكم، أريد الاستفسار عن منتجاتكم.';
