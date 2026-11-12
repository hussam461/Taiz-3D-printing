-- Assign every existing order a six-digit reference while retaining its old
-- reference for administrative lookup and support.
create sequence if not exists public.order_reference_seq as bigint minvalue 1 maxvalue 999999 start 1;
alter table public.orders add column if not exists legacy_reference text;

do $$
declare
  order_count bigint;
  largest_reference bigint;
  sequence_value bigint;
  sequence_called boolean;
begin
  select count(*) into order_count from public.orders;
  if order_count > 999999 then
    raise exception 'six-digit order references are limited to 999999 orders';
  end if;

  if exists (select 1 from public.orders where reference !~ '^[0-9]{6}$') then
    update public.orders
    set legacy_reference = coalesce(legacy_reference, reference);

    -- Move references out of the target range before assigning the new values.
    update public.orders set reference = '__six_digit_migration__' || id::text;

    with numbered_orders as (
      select id, lpad(row_number() over (order by created_at, id)::text, 6, '0') as new_reference
      from public.orders
    )
    update public.orders as order_row
    set reference = numbered_orders.new_reference
    from numbered_orders
    where order_row.id = numbered_orders.id;
  end if;

  select coalesce(max(reference::bigint), 0) into largest_reference from public.orders;
  select last_value, is_called into sequence_value, sequence_called from public.order_reference_seq;
  if not sequence_called or sequence_value < largest_reference then
    if largest_reference = 0 then
      perform setval('public.order_reference_seq', 1, false);
    else
      perform setval('public.order_reference_seq', largest_reference, true);
    end if;
  end if;
end;
$$;

alter table public.orders
  alter column reference set default lpad(nextval('public.order_reference_seq')::text, 6, '0');

notify pgrst, 'reload schema';
