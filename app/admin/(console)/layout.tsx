import { requireAdmin } from "@/lib/auth/admin";
import { AdminNav } from "@/components/admin/nav";

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="admin-console-shell flex min-h-screen flex-col items-stretch bg-bg md:flex-row md:items-start"><AdminNav /><main className="relative z-0 min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:p-10"><div className="mx-auto w-full max-w-[1600px]">{children}</div></main></div>;
}
