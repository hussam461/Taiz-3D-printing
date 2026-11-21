import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicSupabaseEnv } from "@/lib/supabase/env";

export const STOREFRONT_PUBLIC_CACHE_TAG = "storefront-public-data";
export const STOREFRONT_PRODUCTS_CACHE_TAG = "storefront-products";
export const STOREFRONT_PUBLIC_CACHE_SECONDS = 60 * 60 * 24 * 365;

export function cachePublicQuery<Args extends unknown[], Result>(
  key: string,
  query: (supabase: SupabaseClient, ...args: Args) => Promise<Result>,
  tags: string[] = [STOREFRONT_PUBLIC_CACHE_TAG],
): (...args: Args) => Promise<Result> {
  return unstable_cache(
    async (...args: Args) => {
      if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
      const { url, anonKey } = publicSupabaseEnv();
      const supabase = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      return query(supabase, ...args);
    },
    ["storefront-public", key],
    { revalidate: STOREFRONT_PUBLIC_CACHE_SECONDS, tags },
  );
}
