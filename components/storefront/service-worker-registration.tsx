"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let disposed = false;
    const onControllerChange = () => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) return;

      const channel = new MessageChannel();
      channel.port1.onmessage = (event: MessageEvent<{ version?: string }>) => {
        channel.port1.close();
        if (disposed || typeof event.data?.version !== "string") return;

        try {
          if (sessionStorage.getItem("taiz-offline-sw-version") === event.data.version) return;
          sessionStorage.setItem("taiz-offline-sw-version", event.data.version);
          window.location.reload();
        } catch {
          // Keep the current page if browser storage is unavailable.
        }
      };
      controller.postMessage({ type: "GET_VERSION" }, [channel.port2]);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => {
      console.error("Could not register storefront offline support", error);
    });

    if (navigator.serviceWorker.controller) onControllerChange();

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
