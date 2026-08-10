import { supabase } from "@/integrations/supabase/client";

const THROTTLE_MS = 5 * 60 * 1000; // at most once every 5 minutes per business
const storageKey = (businessId: string) => `zampos:last-sync-touch:${businessId}`;

/**
 * Records "last seen online" for a business so the admin dashboard can show a
 * real Last sync time. Cheap, throttled, and completely non-blocking: any
 * failure is swallowed so it can never break the app or POS flows.
 */
export async function touchBusinessSync(
  businessId: string | undefined,
  opts: { force?: boolean } = {},
): Promise<void> {
  if (!businessId) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  try {
    if (!opts.force) {
      const last = Number(localStorage.getItem(storageKey(businessId)) || 0);
      if (last && Date.now() - last < THROTTLE_MS) return;
    }
    localStorage.setItem(storageKey(businessId), String(Date.now()));
  } catch {
    // localStorage unavailable — still attempt the update
  }

  try {
    await (supabase.rpc as any)("touch_business_sync", { _business_id: businessId });
  } catch {
    // ignore — heartbeat is best-effort
  }
}
