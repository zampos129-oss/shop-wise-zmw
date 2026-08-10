import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Service worker is registered inside <PWAUpdatePrompt /> (mounted in App)
// so we can show a "New version available" toast and auto-reload.
// Here we only clean up stale SWs in preview/iframe contexts.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com"));

if ((isInIframe || isPreviewHost) && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

// ---------------------------------------------------------------------------
// Stale-chunk self-healing WITHOUT reloading the app.
//
// If an old cached index.html points at JS chunks that no longer exist, we
// quietly unregister service workers and purge caches. No page reload is
// forced — the next natural navigation picks up the fresh build.
// ---------------------------------------------------------------------------
const CLEANUP_FLAG = "zampos:sw-cleanup-done";

const looksLikeChunkLoadError = (msg: string | undefined | null): boolean => {
  if (!msg) return false;
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
};

const cleanupStaleServiceWorker = async () => {
  try {
    if (sessionStorage.getItem(CLEANUP_FLAG)) return;
    sessionStorage.setItem(CLEANUP_FLAG, "1");

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {
    // ignore — best effort only
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (looksLikeChunkLoadError(event?.message)) {
      void cleanupStaleServiceWorker();
    }
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg =
      typeof reason === "string"
        ? reason
        : reason && typeof reason.message === "string"
          ? reason.message
          : "";
    if (looksLikeChunkLoadError(msg)) {
      void cleanupStaleServiceWorker();
    }
  });
}

