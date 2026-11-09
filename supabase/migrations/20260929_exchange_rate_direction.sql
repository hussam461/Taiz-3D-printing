-- Define the configured exchange rate as new Yemeni rials per one old rial.
-- Numeric values entered by the administrator are preserved; new orders now
-- multiply the old-rial amount by this value. Existing order snapshots stay intact.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exchange_rates'
      and column_name = 'old_rial_per_new_rial'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exchange_rates'
      and column_name = 'new_rial_per_old_rial'
  ) then
    alter table public.exchange_rates
      rename column old_rial_per_new_rial to new_rial_per_old_rial;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exchange_rates'
      and column_name = 'new_rial_per_old_rial'
  ) then
    raise exception 'exchange_rates table or expected exchange-rate column was not found';
  end if;
end;
$$;

comment on column public.exchange_rates.new_rial_per_old_rial is
  'Number of new Yemeni rials equal to one old Yemeni rial.';
