import { getAdminUser } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const supabase = createServiceClient();
  const { data: proof } = await supabase
    .from("payment_proofs")
    .select("storage_path, mime_type, original_filename")
    .eq("id", id)
    .maybeSingle();
  if (!proof) return new Response("Not found", { status: 404 });
  const { data, error } = await supabase.storage.from("payment-proofs").download(proof.storage_path);
  if (error || !data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": proof.mime_type,
      "Content-Disposition": `inline; filename="${proof.original_filename ?? "proof"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
