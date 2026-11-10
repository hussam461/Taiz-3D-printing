create table if not exists public.custom_order_content (
  id smallint primary key default 1 check (id = 1),
  eyebrow text not null default 'تصنيع حسب فكرتك',
  title text not null default 'حوّل فكرتك إلى قطعة مطبوعة ثلاثيًا',
  description text not null default 'لديك فكرة أو تصميم أو صورة وتحتاج إلى تنفيذها؟ تواصل معنا عبر واتساب، وسنراجع التفاصيل معك ونقترح طريقة التنفيذ المناسبة.',
  whatsapp_message text not null default 'مرحبًا، أريد طلب طباعة ثلاثية الأبعاد مخصّصة.',
  response_time text not null default 'نراجع التفاصيل ونرد عليك بأقرب وقت ممكن.',
  process_title text not null default 'كيف يتم طلبك؟',
  process_description text not null default 'ثلاث خطوات واضحة من إرسال الفكرة حتى تأكيد التنفيذ.',
  steps jsonb not null default '[{"title":"شارك فكرتك","description":"أرسل وصفًا مختصرًا لما تريد طباعته أو أرفق صورة أو تصميمًا في المحادثة."},{"title":"نراجع التفاصيل","description":"نراجع الفكرة وإمكانية التنفيذ والخامة المناسبة، ثم نوضح لك أي تفاصيل لازمة."},{"title":"نؤكد السعر والمدة","description":"يتم الاتفاق على السعر ومدة الإنتاج وطريقة التسليم قبل بدء التنفيذ."}]'::jsonb,
  materials_title text not null default 'ما الذي يمكنك إرساله؟',
  materials_description text not null default 'أرسل وصفًا للفكرة، صورة مرجعية، رسمًا، أو ملف تصميم جاهز. الطلبات المخصصة لا تُسعّر تلقائيًا من السلة؛ يتم تحديد السعر والتفاصيل بعد مراجعة الطلب.',
  materials jsonb not null default '["فكرة أو وصف للقطعة","صورة أو رسم مرجعي","ملف تصميم جاهز","الخامة واللون المطلوبان"]'::jsonb,
  note text not null default 'هذا المسار مخصص للطلبات التي تحتاج مراجعة وتسعيرًا يدويًا. لا يتم تأكيد الطلب أو بدء التصنيع قبل الاتفاق معك على السعر والتفاصيل.',
  updated_at timestamptz not null default now()
);

alter table public.custom_order_content enable row level security;
drop policy if exists custom_order_content_public_read on public.custom_order_content;
create policy custom_order_content_public_read on public.custom_order_content for select using (true);
drop policy if exists custom_order_content_admin_write on public.custom_order_content;
create policy custom_order_content_admin_write on public.custom_order_content for all using (public.is_admin()) with check (public.is_admin());
grant select on table public.custom_order_content to anon;
grant select, insert, update on table public.custom_order_content to authenticated;
grant all privileges on table public.custom_order_content to service_role;

insert into public.custom_order_content (id)
values (1)
on conflict (id) do nothing;