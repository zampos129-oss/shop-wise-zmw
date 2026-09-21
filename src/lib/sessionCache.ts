// Caches the signed-in identity (role + business) locally so that opening the
// app with no internet keeps the owner/cashier signed in and lands them on the
// right screen instead of dropping into an "unknown" role.

export type CachedRole = 'owner' | 'cashier' | 'super_admin';

interface CachedIdentity {
  userId: string;
  role: CachedRole;
  isSuperAdmin: boolean;
  businessId?: string | null;
  savedAt: string;
}

const KEY = 'zampos:identity';

export const cacheIdentity = (identity: Omit<CachedIdentity, 'savedAt'>): void => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...identity, savedAt: new Date().toISOString() })
    );
  } catch {
    // ignore
  }
};

export const getCachedIdentity = (userId?: string | null): CachedIdentity | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedIdentity;
    if (!parsed?.role) return null;
    if (userId && parsed.userId && parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const cacheIdentityBusinessId = (businessId: string): void => {
  const existing = getCachedIdentity();
  if (!existing) return;
  cacheIdentity({ ...existing, businessId });
};

export const clearCachedIdentity = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
