import { useEffect } from "react";

/**
 * Silent PWA registration.
 *
 * No reload prompts, no forced refreshes — the service worker is registered
 * with autoUpdate/skipWaiting so new versions take over on the next natural
 * navigation. POS usage is never interrupted.
 */
export const PWAUpdatePrompt = () => {
  useEffect(() => {
    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
    const isPreviewHost =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");

    if (isInIframe || isPreviewHost || !import.meta.env.PROD) return;

    let cancelled = false;
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (cancelled) return;
        registerSW({ immediate: true });
      })
      .catch(() => {
        // ignore — app works fine without the service worker
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};
