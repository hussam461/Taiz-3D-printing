import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function safeAdminNextPath(value: string | null | undefined) {
  if (value === "/admin" || (value?.startsWith("/admin/") && !value.startsWith("/admin/mfa/"))) return value;
  return "/admin";
}

export async function getAdminAuthState() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("user_id, role, full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || !profile || profile.role !== "admin") return null;

  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || !assurance) return null;
  return { user, profile, currentLevel: assurance.currentLevel, nextLevel: assurance.nextLevel };
}

export async function getAdminUser() {
  const state = await getAdminAuthState();
  if (!state || state.currentLevel !== "aal2") return null;
  return { user: state.user, profile: state.profile };
}

export async function requireAdmin() {
  const state = await getAdminAuthState();
  if (!state) redirect("/admin/login");
  if (state.currentLevel !== "aal2") {
    if (state.nextLevel === "aal2") redirect("/admin/mfa/verify?next=%2Fadmin");
    redirect("/admin/mfa/setup?next=%2Fadmin");
  }
  return { user: state.user, profile: state.profile };
}
