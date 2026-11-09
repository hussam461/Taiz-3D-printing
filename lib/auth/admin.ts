import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function getAdminUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("user_id, role, full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") return null;
  return { user, profile };
}

export async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return admin;
}
