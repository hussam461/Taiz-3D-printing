-- Track the outstanding order balance separately from the deposit proof.
-- Existing orders with a balance remain untracked so their historical state
-- is never guessed or blocked by the new delivery workflow.
alter table public.orders
  add column if not exists balance_status text,
  add column if not exists balance_paid_at timestamptz,
  add column if not exists balance_paid_by uuid references auth.users (id);

update public.orders
set balance_status = case
  when remaining_old_yer = 0 then 'not_due'
  else 'legacy_untracked'
end
where balance_status is null;

alter table public.orders
  alter column balance_status set default 'due',
  alter column balance_status set not null;

do $$ begin
  alter table public.orders add constraint orders_balance_status_check
    check (balance_status in ('not_due', 'due', 'paid', 'legacy_untracked'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.orders add constraint orders_paid_balance_audit_check
    check (balance_status <> 'paid' or remaining_old_yer = 0 or (balance_paid_at is not null and balance_paid_by is not null));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.orders add constraint orders_balance_amount_state_check
    check ((balance_status <> 'due' or remaining_old_yer > 0) and (balance_status <> 'not_due' or remaining_old_yer = 0));
exception when duplicate_object then null; end $$;

create index if not exists orders_balance_due_idx
  on public.orders (created_at desc) where balance_status = 'due';

create or replace function public.guard_order_balance_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.balance_status is distinct from old.balance_status
    and not (
      old.balance_status = 'due'
      and new.balance_status = 'paid'
      and current_setting('app.balance_payment_rpc', true) = 'true'
    ) then
    raise exception 'balance status can only be changed by the balance payment action';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_balance_status on public.orders;
create trigger orders_guard_balance_status
  before update of balance_status on public.orders
  for each row execute function public.guard_order_balance_status();

drop trigger if exists orders_require_balance_before_shipping on public.orders;
drop function if exists public.guard_order_shipping_balance();
create or replace function public.guard_order_delivery_balance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_status = 'shipped'
    and old.order_status is distinct from 'shipped'
    and new.payment_status <> 'proof_approved' then
    raise exception 'deposit proof is not approved';
  end if;
  if new.order_status = 'completed'
    and old.order_status is distinct from 'completed'
    and new.remaining_old_yer > 0
    and new.balance_status = 'due' then
    raise exception 'remaining balance must be recorded at delivery';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_require_balance_before_completion on public.orders;
create trigger orders_require_balance_before_completion
  before update of order_status on public.orders
  for each row execute function public.guard_order_delivery_balance();

drop function if exists public.admin_record_order_balance_payment(uuid);
create or replace function public.admin_complete_order_delivery(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if current_order.order_status <> 'shipped' then raise exception 'order is not out for delivery'; end if;
  if current_order.payment_status <> 'proof_approved' then raise exception 'deposit proof is not approved'; end if;
  if current_order.balance_status <> 'due' or current_order.remaining_old_yer <= 0 then
    raise exception 'order has no tracked balance due';
  end if;
  perform set_config('app.balance_payment_rpc', 'true', true);
  update public.orders
  set order_status = 'completed', balance_status = 'paid', balance_paid_at = now(), balance_paid_by = auth.uid(), updated_at = now()
  where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, current_order.order_status, 'completed', auth.uid(), 'تم تسليم الطلب وتحصيل المبلغ المتبقي');
end;
$$;

revoke all on function public.admin_complete_order_delivery(uuid) from public, anon;
grant execute on function public.admin_complete_order_delivery(uuid) to authenticated;
revoke all on function public.guard_order_balance_status() from public, anon, authenticated;
revoke all on function public.guard_order_delivery_balance() from public, anon, authenticated;
