export const dynamic = "force-dynamic";

export function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_URL || "release";
  const script = `
const VERSION = ${JSON.stringify(version)};
const PREFIX = "taiz-storefront-";
const PAGE_CACHE = PREFIX + VERSION + "-pages";
const DATA_CACHE = PREFIX + VERSION + "-data";
const ASSET_CACHE = PREFIX + VERSION + "-assets";
const IMAGE_CACHE = PREFIX + VERSION + "-images";
const OFFLINE_CACHE = PREFIX + VERSION + "-offline";
const OFFLINE_URL = new URL("offline.html", self.registration.scope).href;
const CACHE_NAMES = [PAGE_CACHE, DATA_CACHE, ASSET_CACHE, IMAGE_CACHE, OFFLINE_CACHE];

function isRestrictedPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/cart" || pathname.startsWith("/cart/") ||
    pathname === "/checkout" || pathname.startsWith("/checkout/");
}

function isPublicPage(pathname) {
  return !isRestrictedPath(pathname) && !pathname.startsWith("/api/");
}

async function trimCache(cache, limit) {
  const keys = await cache.keys();
  for (const request of keys.slice(0, Math.max(0, keys.length - limit))) {
    await cache.delete(request);
  }
}

async function handleNavigation(request, url) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok && isPublicPage(url.pathname) && response.headers.get("content-type")?.includes("text/html")) {
      try {
        await cache.put(request, response.clone());
        await trimCache(cache, 60);
      } catch { /* A public page remains usable even if storage is full. */ }
    }
    return response;
  } catch {
    if (isPublicPage(url.pathname)) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    const offlineCache = await caches.open(OFFLINE_CACHE);
    return (await offlineCache.match(OFFLINE_URL)) || Response.error();
  }
}

async function handleNetworkFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      try {
        await cache.put(request, response.clone());
        await trimCache(cache, limit);
      } catch { /* Do not fail an online request because local storage is full. */ }
    }
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    try {
      await cache.put(request, response.clone());
      await trimCache(cache, 300);
    } catch { /* Keep the network response if browser storage is full. */ }
  }
  return response;
}

async function handleImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== "opaque") {
      try {
        await cache.put(request, response.clone());
        await trimCache(cache, 120);
      } catch { /* Keep the image response if browser storage is full. */ }
    }
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.add(OFFLINE_URL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const existing = await caches.keys();
    await Promise.all(existing.filter((name) => name.startsWith(PREFIX) && !CACHE_NAMES.includes(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_VERSION") event.ports?.[0]?.postMessage({ version: VERSION });
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isSupabasePublicImage = url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/");

  if (request.destination === "image" && (url.origin === self.location.origin || isSupabasePublicImage)) {
    event.respondWith(handleImage(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (isRestrictedPath(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  const isPublicProductApi = url.pathname === "/api/storefront/products";
  const isRsc = request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (isPublicProductApi || (isRsc && isPublicPage(url.pathname))) {
    event.respondWith(handleNetworkFirst(request, DATA_CACHE, 120));
  }
});
`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
