import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useSalesSync } from "@/hooks/useSalesSync";
import { useStockSync } from "@/hooks/useStockSync";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { touchBusinessSync } from "@/lib/syncHeartbeat";

export const AppSyncManager = () => {
  const { user, isLoading } = useAuthContext();
  const { business } = useBusiness(!isLoading ? user?.id : undefined);

  useSalesSync(business?.id);
  useStockSync(business?.id);
  useRealtimeSync(business?.id);

  const businessId = business?.id;

  // Lightweight "last sync" heartbeat: on app/tab open, when the tab becomes
  // visible again, when connectivity returns, and after a sale sync completes.
  useEffect(() => {
    if (!businessId) return;

    void touchBusinessSync(businessId);

    const onVisible = () => {
      if (document.visibilityState === "visible") void touchBusinessSync(businessId);
    };
    const onOnline = () => void touchBusinessSync(businessId, { force: true });
    const onSyncComplete = () => void touchBusinessSync(businessId, { force: true });

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("zampos:sync-complete", onSyncComplete);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("zampos:sync-complete", onSyncComplete);
    };
  }, [businessId]);

  return null;
};
