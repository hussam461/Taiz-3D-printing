import { createClient } from "@supabase/supabase-js";
import { publicSupabaseEnv, serviceRoleKey } from "@/lib/supabase/env";

export function createServiceClient() {
  const { url } = publicSupabaseEnv();
  return createClient(url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
