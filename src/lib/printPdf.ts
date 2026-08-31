// Reliable in-page printing that avoids popup blockers.
//
// The previous approach used window.open(url) for PDFs, but because the
// PDF generation is async, window.open ran AFTER an await. That means it was
// no longer inside the user's synchronous click gesture, so browsers treated
// it as a popup and silently blocked it — the print dialog never appeared.
//
// This prints a Blob/URL inside a hidden iframe in the CURRENT page (no
// popup involved), so popup blockers don't apply and the print dialog always
// opens when the user clicks Print.

export function printBlobUrl(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* noop */ }
      URL.revokeObjectURL(url);
    }, 600);
  };

  iframe.onload = () => {
    // Give the embedded document / PDF viewer a moment to finish loading its
    // print layout before triggering the print dialog.
    setTimeout(() => {
      try {
        const w = iframe.contentWindow;
        if (w) {
          w.focus();
          w.print();
          let settled = false;
          const settle = () => {
            if (settled) return;
            settled = true;
            cleanup();
          };
          w.addEventListener("afterprint", settle);
          setTimeout(settle, 30000);
          return;
        }
      } catch { /* ignore */ }
      cleanup();
    }, 200);
  };

  iframe.onerror = cleanup;
  iframe.src = url;
}
