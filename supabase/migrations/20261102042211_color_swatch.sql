alter table public.colors
  add column if not exists hex_code text not null default '#64748b'
  check (hex_code ~ '^#[0-9A-Fa-f]{6}$');

update public.colors
set hex_code = case
  when name ilike '%أسود%' or name ilike '%black%' then '#111111'
  when name ilike '%أبيض%' or name ilike '%ابيض%' or name ilike '%white%' then '#ffffff'
  when name ilike '%ذهبي%' or name ilike '%gold%' then '#f5b301'
  when name ilike '%فضي%' or name ilike '%silver%' then '#cbd5e1'
  when name ilike '%تركوازي%' or name ilike '%turquoise%' then '#14b8a6'
  when name ilike '%فيروزي%' then '#2dd4bf'
  when name ilike '%سماوي%' then '#22d3ee'
  when name ilike '%أزرق%' or name ilike '%ازرق%' or name ilike '%blue%' then '#3b82f6'
  when name ilike '%أخضر%' or name ilike '%اخضر%' or name ilike '%green%' then '#22c55e'
  when name ilike '%أحمر%' or name ilike '%احمر%' or name ilike '%red%' then '#ef4444'
  when name ilike '%أصفر%' or name ilike '%اصفر%' or name ilike '%yellow%' then '#facc15'
  when name ilike '%برتقالي%' or name ilike '%orange%' then '#f97316'
  when name ilike '%زهري%' then '#e879f9'
  when name ilike '%وردي%' or name ilike '%pink%' then '#ec4899'
  when name ilike '%بنفسجي%' or name ilike '%purple%' then '#a855f7'
  when name ilike '%بني%' or name ilike '%brown%' then '#92400e'
  when name ilike '%رمادي%' or name ilike '%gray%' or name ilike '%grey%' then '#9ca3af'
  when name ilike '%كحلي%' or name ilike '%navy%' then '#1e3a8a'
  else hex_code
end
where hex_code = '#64748b';
