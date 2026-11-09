import { AdminLoginForm } from "@/components/admin/login-form";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy p-4 sm:p-8"><div className="pointer-events-none absolute -start-32 -top-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" /><div className="pointer-events-none absolute -bottom-40 -end-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl" /><AdminLoginForm next={params.next?.startsWith("/admin") ? params.next : "/admin"} /></main>;
}
