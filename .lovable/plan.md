## What's done in Batch 2 already

After auditing, Batch 2 (Inventory & Products) is **mostly shipped**:

- ✅ Product images (upload component + private `product-images` bucket + storage RLS)
- ✅ Product categories table & UI
- ✅ Product variants table & `VariantsManager`
- ✅ Inventory Dashboard (cost value, retail value, expected profit, low/out-of-stock)
- ❌ **Missing: stock-adjustment approval workflow** — cashiers and owners both edit stock directly today.

So Batch 2 needs one more piece. I'll ship that, then fix the image URL issue, then restyle the Admin Dashboard.

---

## 1. Finish Batch 2 — Stock Adjustment Approval

**DB migration**

- New table `stock_adjustment_requests`: `id, business_id, product_id, variant_id (nullable), requested_by, adjustment_type ('add'|'remove'), quantity, reason, status ('pending'|'approved'|'rejected'), reviewed_by, reviewed_at, review_note, created_at`.
- GRANTs to `authenticated` + `service_role`. RLS:
  - Owner of business: full SELECT/UPDATE on own rows.
  - Cashiers of business: SELECT + INSERT own rows (status forced 'pending').
- RPC `approve_stock_adjustment(request_id uuid, note text)` (SECURITY DEFINER): owner-only, applies the delta to `products.stock` (or `product_variants.stock`), marks the request approved.
- RPC `reject_stock_adjustment(request_id uuid, note text)`: owner-only, marks rejected.

**UI (Products page)**

- Existing "Adjust Stock" dialog stays as-is for owners (direct).
- For cashiers it submits a request via the new table instead of mutating stock; toast "Sent for owner approval".
- New owner-only **Pending Adjustments** card at top of Products page listing pending requests with Approve / Reject buttons + note input.

## 2. Permanent product image URLs (no more 1-hour signed URLs)

- Flip `product-images` bucket to **public** via `storage_update_bucket`.
- Replace the public-read storage policy so anyone can `SELECT`; keep write/update/delete locked to the business owner's `{business_id}/...` prefix.
- Switch `ProductImageUpload.tsx` and `useProducts.ts` from `createSignedUrl(s)` to `getPublicUrl` — URLs become stable forever (no expiry, no re-signing on every product list load).

## 3. Admin Dashboard redesign (match reference screenshot)

Target layout (single page, tabbed):

```text
┌──────────────────────────────────────────────────────────┐
│ [shield] Admin Dashboard         [theme] [Refresh] [Out] │
│         Manage your ZamPOS platform                      │
├──────────────────────────────────────────────────────────┤
│ [Stats] [Businesses] [Subscriptions] [Payouts]           │
│ [Affiliates] [Settings]                                  │
├──────────────────────────────────────────────────────────┤
│  KPI cards: Businesses Registered • Active Subs •        │
│             Monthly Revenue • Platform Status            │
│  ─ Subscription Overview ─                               │
│   Active │ Trial/Free │ Expired/Locked                   │
│  ─ Revenue Overview ─                                    │
│   Current Monthly │ Sub Fee │ Collection Rate            │
└──────────────────────────────────────────────────────────┘
```

Tabs:

- **Stats** — new overview (KPIs + Subscription Overview + Revenue Overview cards).
- **Businesses** — current businesses list (moved here from current default tab).
- **Subscriptions** — extracted subscription extension controls + lock/unlock per business in a denser table.
- **Payouts** — existing affiliate payouts queue (currently buried in Affiliates panel).
- **Affiliates** — current `AdminAffiliatePanel`.
- **Settings** — notices management + a placeholder for future platform settings.

All new cards/badges use existing semantic tokens (no hardcoded colors). Status colors (green / blue / red / orange) keep the same semantic mappings already used by `statusBadge`.

---

## Technical notes

- Migration order: create table → GRANT → ALTER ENABLE RLS → CREATE POLICY → CREATE RPCs.
- Bucket flip is non-destructive — existing files keep working and get permanent URLs.
- AdminDashboard rewrite stays one file; I'll split internal sections into local components but keep them in `src/pages/AdminDashboard.tsx`.
- No changes to auth, sales, debtors, or POS in this pass.

Approve and I'll execute all three in one go. and check if there is any other patch apart from the second one or its the last one 

&nbsp;