-- Remove the retired admin activity log table.
-- This permanently deletes its historical activity rows.
DROP TABLE IF EXISTS public.activity_logs;
