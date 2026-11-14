import { requireAdmin } from "@/lib/auth/admin";
import { AdminNav } from "@/components/admin/nav";

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="admin-console-shell flex min-h-screen w-full min-w-0 flex-col items-stretch overflow-x-clip bg-bg md:flex-row md:items-start"><AdminNav /><main className="relative z-0 w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 md:w-auto"><div className="mx-auto w-full min-w-0 max-w-[1600px]">{children}</div></main></div>;
}
