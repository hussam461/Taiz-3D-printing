-- Keep only the two production stages: in production and completed.
-- Orders still awaiting an approved deposit proof remain pending; cancelled orders stay archived.
update public.orders
set order_status = case
  when payment_status = 'proof_approved' then 'in_production'::public.order_status
  else 'pending'::public.order_status
end
where order_status in ('confirmed', 'ready', 'shipped');

update public.order_status_history
set from_status = case
  when from_status::text in ('confirmed', 'ready', 'shipped') then 'in_production'::public.order_status
  else from_status
end,
to_status = case
  when to_status::text in ('confirmed', 'ready', 'shipped') then 'in_production'::public.order_status
  else to_status
end
where from_status::text in ('confirmed', 'ready', 'shipped')
   or to_status::text in ('confirmed', 'ready', 'shipped');

alter table public.orders alter column order_status drop default;
-- PostgreSQL will not change the column type while an UPDATE OF trigger depends on it.
drop trigger if exists orders_require_balance_before_completion on public.orders;
alter type public.order_status rename to order_status_legacy;
create type public.order_status as enum ('pending', 'in_production', 'completed', 'cancelled');

alter table public.orders
  alter column order_status type public.order_status
  using order_status::text::public.order_status;
alter table public.order_status_history
  alter column from_status type public.order_status
    using case when from_status is null then null else from_status::text::public.order_status end,
  alter column to_status type public.order_status
    using to_status::text::public.order_status;
alter table public.orders alter column order_status set default 'pending'::public.order_status;

create or replace function public.guard_order_delivery_balance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_status = 'completed'
    and old.order_status is distinct from 'completed'
    and new.payment_status <> 'proof_approved' then
    raise exception 'deposit proof is not approved';
  end if;
  if new.order_status = 'completed'
    and old.order_status is distinct from 'completed'
    and new.remaining_old_yer > 0
    and new.balance_status = 'due'
    and current_setting('app.balance_payment_rpc', true) is distinct from 'true' then
    raise exception 'remaining balance must be recorded at delivery';
  end if;
  return new;
end;
$$;

create trigger orders_require_balance_before_completion
  before update of order_status on public.orders
  for each row execute function public.guard_order_delivery_balance();

create or replace function public.admin_complete_order_delivery(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  completion_note text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if current_order.order_status <> 'in_production' then raise exception 'order is not in production'; end if;
  if current_order.payment_status <> 'proof_approved' then raise exception 'deposit proof is not approved'; end if;

  if current_order.balance_status = 'due' then
    if current_order.remaining_old_yer <= 0 then raise exception 'no tracked balance'; end if;
    perform set_config('app.balance_payment_rpc', 'true', true);
    update public.orders
    set order_status = 'completed', balance_status = 'paid', balance_paid_at = now(), balance_paid_by = auth.uid(), updated_at = now()
    where id = p_order_id;
    completion_note := 'تم تسليم الطلب وتحصيل المبلغ المتبقي';
  elsif current_order.balance_status in ('not_due', 'paid', 'legacy_untracked') then
    update public.orders set order_status = 'completed', updated_at = now() where id = p_order_id;
    completion_note := case
      when current_order.balance_status = 'legacy_untracked' then 'تم تسليم الطلب؛ حالة المتبقي التاريخية غير محددة'
      when current_order.balance_status = 'paid' then 'تم تسليم الطلب؛ سبق تسجيل تحصيل المتبقي'
      else 'تم تسليم الطلب ولا يوجد مبلغ متبقٍ'
    end;
  else
    raise exception 'no tracked balance';
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, current_order.order_status, 'completed', auth.uid(), completion_note);
end;
$$;

revoke all on function public.admin_complete_order_delivery(uuid) from public, anon;
grant execute on function public.admin_complete_order_delivery(uuid) to authenticated;

create or replace function public.admin_review_order_payment_proof(
  p_proof_id uuid,
  p_decision text,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_proof public.payment_proofs%rowtype;
  current_order public.orders%rowtype;
  next_status public.order_status;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then raise exception 'invalid decision'; end if;
  select * into current_proof from public.payment_proofs where id = p_proof_id for update;
  if not found then raise exception 'proof not found'; end if;
  if current_proof.status <> 'pending' then raise exception 'proof already reviewed'; end if;
  select * into current_order from public.orders where id = current_proof.order_id for update;
  if not found then raise exception 'order not found'; end if;
  if p_decision = 'approved' and current_order.order_status in ('completed', 'cancelled') then
    raise exception 'order is closed';
  end if;

  update public.payment_proofs
  set status = p_decision::public.proof_status,
      rejection_reason = case when p_decision = 'rejected' then nullif(btrim(p_reason), '') else null end,
      reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_proof_id;

  next_status := current_order.order_status;
  if p_decision = 'approved' and current_order.order_status = 'pending' then
    next_status := 'in_production';
  end if;

  update public.orders
  set payment_status = case
        when p_decision = 'approved' then 'proof_approved'::public.payment_status
        when payment_status = 'proof_approved' then payment_status
        else 'proof_rejected'::public.payment_status
      end,
      order_status = next_status,
      updated_at = now()
  where id = current_order.id;

  if next_status is distinct from current_order.order_status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
    values (current_order.id, current_order.order_status, next_status, auth.uid(), 'تم اعتماد إثبات العربون وبدأ تجهيز الطلب');
  end if;
end;
$$;

revoke all on function public.admin_review_order_payment_proof(uuid, text, text) from public, anon;
grant execute on function public.admin_review_order_payment_proof(uuid, text, text) to authenticated;
drop type public.order_status_legacy;
notify pgrst, 'reload schema';
