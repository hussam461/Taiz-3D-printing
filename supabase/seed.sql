insert into public.store_settings (id, store_name, description, hero_headline, hero_description, deposit_percent)
values (
  1,
  'Taiz 3D Printing',
  'منصة يمنية للطباعة ثلاثية الأبعاد والمنتجات المصنّعة حسب الطلب.',
  'طباعة ثلاثية الأبعاد بمعايير تصنيع واضحة',
  'منتجات جاهزة وطلبات مخصّصة، بأسعار بالريال اليمني القديم وتسليم منظّم داخل اليمن.',
  30
)
on conflict (id) do nothing;

insert into public.contact_settings (id, phone, whatsapp, instagram)
values (1, '967770000000', '967770000000', 'https://instagram.com/taizprinter')
on conflict (id) do nothing;

insert into public.currencies (code, name, is_enabled, display_order)
values
  ('OLD_YER', 'الريال اليمني القديم', true, 1),
  ('NEW_YER', 'الريال اليمني الجديد', true, 2)
on conflict (code) do nothing;

insert into public.exchange_rates (new_rial_per_old_rial)
select 50
where not exists (select 1 from public.exchange_rates);

insert into public.free_delivery_settings (id, is_enabled, min_order_value_old_yer)
values (1, true, 50000)
on conflict (id) do nothing;

insert into public.colors (name, is_default, is_active, sort_order)
select * from (values
  ('لون المنتج الحالي', true, true, 0),
  ('أبيض', false, true, 1),
  ('أسود', false, true, 2),
  ('أزرق', false, true, 3),
  ('أحمر', false, true, 4)
) as v(name, is_default, is_active, sort_order)
where not exists (select 1 from public.colors);

insert into public.materials (name, is_default, is_active, sort_order)
select * from (values
  ('PLA', true, true, 0),
  ('PETG', false, true, 1),
  ('ABS', false, true, 2),
  ('راتنج', false, true, 3)
) as v(name, is_default, is_active, sort_order)
where not exists (select 1 from public.materials);

insert into public.delivery_areas (governorate, city_area, fee_old_yer, is_active, sort_order)
select * from (values
  ('تعز', 'المدينة', 2000, true, 1),
  ('صنعاء', 'الأمانة', 3500, true, 2),
  ('عدن', null, 4000, true, 3),
  ('إب', null, 3000, true, 4),
  ('الحديدة', null, 4500, true, 5)
) as v(governorate, city_area, fee_old_yer, is_active, sort_order)
where not exists (select 1 from public.delivery_areas);

insert into public.payment_accounts (name, account_number, currency_code, instructions, is_active, sort_order)
select * from (values
  ('محفظة الريال القديم', 'OLD-770000000', 'OLD_YER'::public.payment_currency, 'حوّل مبلغ العربون إلى هذا الحساب ثم ارفع إثبات التحويل.', true, 1),
  ('محفظة الريال الجديد', 'NEW-770000001', 'NEW_YER'::public.payment_currency, 'حوّل مبلغ العربون بالريال اليمني الجديد ثم ارفع إثبات التحويل.', true, 2)
) as v(name, account_number, currency_code, instructions, is_active, sort_order)
where not exists (select 1 from public.payment_accounts);

insert into public.categories (name, slug, description, sort_order, is_active)
select * from (values
  ('نماذج هندسية', 'engineering', 'قطع وأدوات مساعدة للتصميم والورش.', 1, true),
  ('ديكور منزلي', 'home-decor', 'قطع ديكور مطبوعة ثلاثياً.', 2, true),
  ('إكسسوارات', 'accessories', 'حاملات ومنظمات يومية.', 3, true)
) as v(name, slug, description, sort_order, is_active)
where not exists (select 1 from public.categories);

insert into public.faq_items (question, answer, sort_order, is_published)
select * from (values
  ('كيف يتم حساب السعر؟', 'أسعار المنتجات بالريال اليمني القديم. يظهر السعر النهائي بعد الخصم ورسوم التوصيل أو التوصيل المجاني إن انطبق.', 1, true),
  ('هل أدفع المبلغ كاملًا الآن؟', 'العربون الافتراضي 30٪ من الإجمالي، ويُحفظ مع الطلب. المتبقي يُستكمل حسب تعليمات المتجر.', 2, true),
  ('هل يمكن طلب تصميم خاص؟', 'نعم عبر صفحة الطلب المخصّص. السعر والإنتاج يُؤكدان بعد مراجعة الفكرة، وليس تلقائيًا من السلة.', 3, true)
) as v(question, answer, sort_order, is_published)
where not exists (select 1 from public.faq_items);

insert into public.homepage_benefits (title, description, is_published, sort_order)
select * from (values
  ('جودة طباعة عالية', 'نراجع إعدادات التصنيع وجودة المنتج قبل تسليمه.', true, 0),
  ('سعر واضح', 'نعرض السعر والخصم بوضوح قبل إتمام الطلب.', true, 1),
  ('طلب مخصص', 'أرسل فكرتك أو تصميمك لنراجع إمكانية تنفيذه.', true, 2)
) as benefits(title, description, is_published, sort_order)
where not exists (select 1 from public.homepage_benefits);

insert into public.legal_pages (slug, title, body)
values
  ('about', 'من نحن', 'Taiz 3D Printing منصة يمنية للطباعة ثلاثية الأبعاد، تركّز على وضوح السعر والتوريد والمراجعة الإدارية للطلبات.'),
  ('terms', 'الشروط', 'باستخدام المتجر توافق على تزويد بيانات تسليم صحيحة ورفع إثبات دفع مطابق للتحويل.'),
  ('privacy', 'الخصوصية', 'لا ننشئ حسابات للعملاء في الإصدار الحالي. تُستخدم بيانات الطلب لإتمام التصنيع والتسليم فقط.'),
  ('payment-policy', 'سياسة الدفع', 'الدفع عبر الحسابات اليمنية المعروضة في إتمام الطلب بالريال القديم أو الجديد. لا ندعم الريال السعودي.'),
  ('delivery-policy', 'سياسة التوصيل', 'رسوم التوصيل حسب المنطقة الإدارية. قد يُطبَّق توصيل مجاني إذا فعّله المسؤول وبلغ الطلب الحد الأدنى.'),
  ('custom-orders-policy', 'سياسة الطلبات المخصّصة', 'الطلب المخصّص مراجعة يدوية للسعر والإنتاج، ولا يُحسب كسعر سلة تلقائي.'),
  ('refund-policy', 'سياسة الاسترجاع', 'تُراجع طلبات الاسترجاع حسب حالة التصنيع وإثبات الدفع، ويُبتّ فيها من الإدارة.')
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, base_price_old_yer, discount_percent, is_active, is_featured, specifications)
select c.id, v.name, v.slug, v.description, v.price, v.discount, true, v.featured, v.specs::jsonb
from (
  values
    ('engineering', 'حامل أدوات مكتبي', 'desk-organizer', 'منظم مكتبي مطبوع ثلاثياً للاستخدام اليومي.', 12000, 10::numeric, true, '[{"label":"الاستخدام","value":"مكتب"}]'),
    ('home-decor', 'مزهرية هندسية', 'geo-vase', 'مزهرية بسطح هندسي مناسب للديكور الداخلي.', 18000, null::numeric, true, '[{"label":"المناسبة","value":"ديكور"}]'),
    ('accessories', 'حامل هاتف', 'phone-stand', 'حامل هاتف ثابت بزاوية مشاهدة مريحة.', 7000, 15::numeric, false, '[{"label":"التوافق","value":"معظم الهواتف"}]')
) as v(cat, name, slug, description, price, discount, featured, specs)
join public.categories c on c.slug = v.cat
where not exists (select 1 from public.products p where p.slug = v.slug);

insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_main)
select p.id, '/placeholders/product.svg', p.name, 0, true
from public.products p
where not exists (select 1 from public.product_images i where i.product_id = p.id);

-- After Auth user exists:
-- insert into public.admin_profiles (user_id, full_name) values ('<AUTH_USER_UUID>', 'مدير المتجر');
