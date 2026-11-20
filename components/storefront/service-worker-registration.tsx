"use client";

import { useEffect } from "react";

/** Updates any previously installed offline worker to the removal script. */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !navigator.onLine || !("serviceWorker" in navigator)) return;

    const cleanup = async () => {
      const workerUrl = new URL("/sw.js", window.location.origin).href;
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        const workers = [registration.active, registration.waiting, registration.installing];
        if (!workers.some((worker) => worker?.scriptURL === workerUrl)) continue;

        // /sw.js is now a one-time removal worker. It deletes its old caches and
        // unregisters itself once activated. Keep retrying on later visits if
        // the browser cannot reach the updated script this time.
        await registration.update();
      }
    };

    void cleanup().catch(() => {
      // A failed background cleanup must not interfere with online browsing.
    });
  }, []);

  return null;
}
