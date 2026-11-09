-- Simplify manager operations without rewriting existing orders:
-- approving a deposit proof starts production, and delivery is completed
-- directly from ready (legacy shipped orders remain completable).

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
    and new.balance_status = 'due'
    and current_setting('app.balance_payment_rpc', true) is distinct from 'true' then
    raise exception 'remaining balance must be recorded at delivery';
  end if;
  return new;
end;
$$;

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
  if current_order.order_status not in ('ready', 'shipped') then
    raise exception 'order is not ready for delivery';
  end if;
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
  if p_decision = 'rejected' and nullif(btrim(p_reason), '') is null then
    raise exception 'rejection reason required';
  end if;

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
      rejection_reason = case when p_decision = 'rejected' then btrim(p_reason) else null end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_proof_id;

  next_status := current_order.order_status;
  if p_decision = 'approved' and current_order.order_status in ('pending', 'confirmed') then
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

revoke all on function public.admin_complete_order_delivery(uuid) from public, anon;
grant execute on function public.admin_complete_order_delivery(uuid) to authenticated;
revoke all on function public.admin_review_order_payment_proof(uuid, text, text) from public, anon;
grant execute on function public.admin_review_order_payment_proof(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
