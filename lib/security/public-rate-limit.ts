import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export type PublicRateLimitName = "adminLogin" | "checkout" | "proofUpload" | "productSearch";

type Policy = {
  limit: number;
  window: `${number} ${"s" | "m" | "h"}`;
};

const policies: Record<PublicRateLimitName, Policy> = {
  adminLogin: { limit: 5, window: "10 m" },
  checkout: { limit: 5, window: "10 m" },
  proofUpload: { limit: 10, window: "1 h" },
  productSearch: { limit: 60, window: "1 m" },
};

type RateLimiter = { limit: (identifier: string) => Promise<{ success: boolean; reset: number }> };

let limiters: Partial<Record<PublicRateLimitName, RateLimiter>> | null = null;

function getLimiters() {
  if (limiters) return limiters;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  const createLimiter = (name: PublicRateLimitName) => {
    const policy = policies[name];
    return new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(policy.limit, policy.window),
      prefix: `taiz-store:${name}`,
      analytics: false,
    });
  };
  limiters = {
    adminLogin: createLimiter("adminLogin"),
    checkout: createLimiter("checkout"),
    proofUpload: createLimiter("proofUpload"),
    productSearch: createLimiter("productSearch"),
  };
  return limiters;
}

function getClientIp(headers: Headers) {
  // Vercel overwrites x-forwarded-for with the connecting client's address.
  const forwardedFor = headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const address = forwardedFor || headers.get("x-real-ip")?.trim() || (process.env.NODE_ENV !== "production" ? "local-development" : null);
  if (!address || address.length > 128) return null;
  return createHash("sha256").update(address).digest("hex");
}

export async function checkPublicRateLimit(name: PublicRateLimitName, headers: Headers) {
  const ipHash = getClientIp(headers);
  if (!ipHash || !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV !== "production" || name !== "adminLogin") return { allowed: true as const };
    return { allowed: false as const, reason: "unavailable" as const, retryAfter: 60 };
  }

  try {
    const availableLimiters = getLimiters();
    if (!availableLimiters) {
      if (name !== "adminLogin") return { allowed: true as const };
      return { allowed: false as const, reason: "unavailable" as const, retryAfter: 60 };
    }
    const result = await availableLimiters[name]!.limit(ipHash);
    if (result.success) return { allowed: true as const };
    return {
      allowed: false as const,
      reason: "limited" as const,
      retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error("Public rate limit service is unavailable", { name, error });
    if (process.env.NODE_ENV !== "production" || name !== "adminLogin") return { allowed: true as const };
    return { allowed: false as const, reason: "unavailable" as const, retryAfter: 60 };
  }
}

export function publicRateLimitError(reason: "limited" | "unavailable") {
  return reason === "limited"
    ? "وصلت إلى الحد المسموح من المحاولات. انتظر قليلًا ثم حاول مرة أخرى."
    : "الحماية المؤقتة غير متاحة حاليًا. حاول مرة أخرى بعد قليل.";
}
