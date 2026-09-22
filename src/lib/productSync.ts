// Uploads products that were created while the device was offline.
//
// Order matters: pending products MUST be pushed BEFORE queued offline sales
// are synced (their line items may reference the temporary local id) and before
// the catalog is refreshed from the cloud (a refresh clears the local cache).

import { supabase } from "@/integrations/supabase/client";
import {
  getPendingProducts,
  deletePendingProduct,
  removeCachedProduct,
  remapOfflineSaleProductIds,
} from "@/lib/offlineStorage";

export const syncPendingProducts = async (
  businessId: string | undefined
): Promise<{ synced: number; idMap: Record<string, string> }> => {
  const idMap: Record<string, string> = {};
  if (!businessId) return { synced: 0, idMap };

  let pending: Awaited<ReturnType<typeof getPendingProducts>> = [];
  try {
    pending = await getPendingProducts(businessId);
  } catch {
    return { synced: 0, idMap };
  }
  if (pending.length === 0) return { synced: 0, idMap };

  let synced = 0;
  for (const item of pending) {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert({ business_id: businessId, is_active: true, ...(item.payload as any) } as any)
        .select("id")
        .single();

      if (error) throw error;

      if (data?.id) idMap[item.id] = data.id;
      await deletePendingProduct(item.id);
      // Drop the placeholder row so the cloud copy is the only one left.
      await removeCachedProduct(item.id);
      synced += 1;
    } catch (e) {
      // Keep it queued and try again on the next sync pass.
      console.warn("Could not sync offline product yet:", e);
    }
  }

  if (Object.keys(idMap).length > 0) {
    try {
      await remapOfflineSaleProductIds(idMap);
    } catch (e) {
      console.warn("Could not remap offline sale product ids:", e);
    }
  }

  return { synced, idMap };
};
