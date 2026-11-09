import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">سجل النشاط</h1>
      <ul className="space-y-2 text-sm">
        {(data ?? []).map((row) => (
          <li key={row.id} className="rounded-md border border-border bg-surface p-3">
            {row.action} — {row.entity_type} {row.entity_id}
          </li>
        ))}
      </ul>
    </div>
  );
}
