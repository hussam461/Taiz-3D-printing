-- Permit administrators to manually remove a proof row after its file is removed through Storage API.
drop policy if exists proofs_admin_delete on public.payment_proofs;
create policy proofs_admin_delete on public.payment_proofs
  for delete using (public.is_admin());

grant delete on table public.payment_proofs to authenticated;
