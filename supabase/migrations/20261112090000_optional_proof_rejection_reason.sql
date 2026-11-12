-- Allow administrators to reject a payment proof without entering a reason.
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

revoke all on function public.admin_review_order_payment_proof(uuid, text, text) from public, anon;
grant execute on function public.admin_review_order_payment_proof(uuid, text, text) to authenticated;
