import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-medium text-primary">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <Link href={action.href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-primary-hover">{action.label}</Link> : null}
    </header>
  );
}

export function StatusBadge({ value, kind = "neutral" }: { value: string; kind?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const styles = { success: "bg-green-50 text-success", warning: "bg-amber-50 text-warning", danger: "bg-red-50 text-error", info: "bg-blue-50 text-info", neutral: "bg-slate-100 text-muted" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[kind]}`}>{value}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: { href: string; label: string } }) {
  return <section className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center shadow-sm"><h2 className="font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>{action ? <Link href={action.href} className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">{action.label}</Link> : null}</section>;
}

export function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-6"><div className="mb-5 border-b border-border pb-4"><h2 className="font-semibold">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}</div>{children}</section>;
}
