import { NextRequest, NextResponse } from "next/server";
import { searchProducts, type ProductListQuery } from "@/lib/queries/storefront";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = new Set(["newest", "price_asc", "price_desc", "relevance"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawPage = Number(params.get("page") ?? "1");
  if (!Number.isSafeInteger(rawPage) || rawPage < 1 || rawPage > 10_000) {
    return NextResponse.json({ error: "رقم صفحة المنتجات غير صالح." }, { status: 400 });
  }

  const rawSort = params.get("sort") ?? undefined;
  const query: ProductListQuery = {
    q: params.get("q")?.slice(0, 120) || undefined,
    category: params.get("category")?.slice(0, 120) || undefined,
    discounted: params.get("discounted") === "1",
    featured: params.get("featured") === "1",
    sort: rawSort && SORT_OPTIONS.has(rawSort) ? (rawSort as ProductListQuery["sort"]) : undefined,
    page: rawPage,
  };

  return NextResponse.json(await searchProducts(query), {
    headers: { "Cache-Control": "no-store" },
  });
}
