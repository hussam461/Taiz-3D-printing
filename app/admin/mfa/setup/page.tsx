import { redirect } from "next/navigation";
import { AdminMfaSetupForm } from "@/components/admin/mfa-setup-form";
import { getAdminAuthState, safeAdminNextPath } from "@/lib/auth/admin";

export default async function AdminMfaSetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeAdminNextPath(params.next);
  const state = await getAdminAuthState();
  if (!state) redirect("/admin/login");
  if (state.currentLevel === "aal2") redirect(next);
  if (state.nextLevel === "aal2") redirect(`/admin/mfa/verify?next=${encodeURIComponent(next)}`);

  return <main className="flex min-h-screen items-center justify-center bg-bg p-4 sm:p-8"><AdminMfaSetupForm next={next} /></main>;
}
