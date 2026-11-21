import { ImageResponse } from "next/og";
import { getStorefrontContext } from "@/lib/queries/storefront";
import { publicMediaUrl } from "@/lib/storage/public-url";

export const alt = "Taiz 3D Printing — طباعة ثلاثية الأبعاد في اليمن";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function OpenGraphImage() {
  let logoUrl: string | null = null;
  try {
    const { store } = await getStorefrontContext();
    logoUrl = publicMediaUrl(store.logo_path, "store-assets");
    if (logoUrl?.startsWith("/")) {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://taiz3dprinting.dev").replace(/\/+$/, "");
      logoUrl = `${siteUrl}${logoUrl}`;
    }
  } catch {
    // The branded fallback below still produces a valid preview if settings cannot be loaded.
  }

  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(125deg, #081425 0%, #0b2335 58%, #0c766f 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}>
        <div style={{ position: "absolute", width: 540, height: 540, borderRadius: 270, right: -120, top: -220, background: "rgba(45, 212, 191, 0.14)" }} />
        <div style={{ position: "absolute", width: 370, height: 370, borderRadius: 185, left: -110, bottom: -200, background: "rgba(45, 212, 191, 0.12)" }} />
        <div style={{ position: "absolute", inset: 28, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 28, display: "flex" }} />
        <div style={{ position: "absolute", top: 82, right: 86, display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right", width: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#72e0d1", fontSize: 27, fontFamily: "sans-serif" }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#43d6c1" }} />
            3D PRINTING  •  CUSTOM DESIGNS
          </div>
          <div style={{ marginTop: 44, fontSize: 68, lineHeight: 1.2, fontWeight: 700, fontFamily: "sans-serif", letterSpacing: -2 }}>
            Taiz 3D Printing
          </div>
          <div style={{ marginTop: 22, color: "#d2e3ea", fontSize: 30, lineHeight: 1.5, fontFamily: "sans-serif" }}>
            Ideas made tangible.
          </div>
        </div>
        {logoUrl ? (
          <div style={{ position: "absolute", left: 82, top: 184, width: 230, height: 230, padding: 20, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 32, border: "2px solid rgba(115,224,209,0.65)", background: "#ffffff" }}>
            {/* OG image renderer requires a plain img so it can embed the remote logo in the generated image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Taiz 3D Printing logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        ) : (
          <div style={{ position: "absolute", left: 82, top: 201, width: 190, height: 190, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 38, border: "2px solid rgba(115,224,209,0.65)", background: "rgba(5,20,34,0.42)", color: "#65dfd0", fontSize: 102, fontFamily: "sans-serif" }}>3D</div>
        )}
        <div style={{ position: "absolute", left: 82, bottom: 82, display: "flex", flexDirection: "column", color: "#ffffff" }}>
          <div style={{ fontFamily: "sans-serif", fontSize: 20, letterSpacing: 2 }}>TAIZ3DPRINTING.DEV</div>
        </div>
        <div style={{ position: "absolute", right: 86, bottom: 83, display: "flex", alignItems: "center", gap: 12, color: "#a9c4ce", fontSize: 19 }}>
          <div style={{ width: 58, height: 2, background: "#43d6c1" }} />
          PRINT YOUR IDEA
        </div>
      </div>
    ),
    size,
  );
}
