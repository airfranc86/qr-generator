import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget — privacy-friendly CAPTCHA, free unlimited.
 *
 * In development without a real site key set via VITE_TURNSTILE_SITE_KEY,
 * uses the public test key "1x00000000000000000000AA" which always passes.
 */
export default function Turnstile({ siteKey, onVerify, onExpire, theme = "light" }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    let pollHandle;

    const render = () => {
      if (cancelled || !containerRef.current) return;
      if (window.turnstile && !widgetIdRef.current) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => onVerify?.(token),
            "expired-callback": () => onExpire?.(),
            "error-callback": () => onExpire?.(),
            theme,
            size: "flexible",
          });
        } catch (e) {
          console.error("Turnstile render error", e);
        }
      } else if (!window.turnstile) {
        pollHandle = setTimeout(render, 150);
      }
    };

    render();

    return () => {
      cancelled = true;
      if (pollHandle) clearTimeout(pollHandle);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire, theme]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="flex justify-center min-h-[65px]" aria-label="Verificación humana" />;
}
