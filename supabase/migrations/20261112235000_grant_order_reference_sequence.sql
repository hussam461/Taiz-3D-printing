-- Allow the server-side service role to use nextval() for generated order references.
grant usage on sequence public.order_reference_seq to service_role;
