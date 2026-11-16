-- Require an AAL2 (password plus verified MFA factor) session for admin-only RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    and exists (
      select 1
      from public.admin_profiles
      where user_id = auth.uid()
        and role = 'admin'
    );
$$;
