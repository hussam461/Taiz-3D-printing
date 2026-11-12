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
  if (error || !data) {
    console.error("Admin payment proof download failed", { proofId: id, error });
    return new Response("Not found", { status: 404 });
  }
  const filename = String(proof.original_filename ?? "proof").replace(/[\r\n"\\]/g, "_");
  return new Response(data, {
    headers: {
      "Content-Type": proof.mime_type,
      "Content-Disposition": `inline; filename="proof"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
