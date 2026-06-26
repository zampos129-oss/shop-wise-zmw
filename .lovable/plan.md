
## First: your sales are NOT lost

I checked the database directly. Your 3 sales for business **mc101** (owner `mwilaclement129@gmail.com`) are all still there:

```
2026-06-26  K3,000
2026-06-25  K3,000
2026-06-25  K3,000
```

You're seeing an empty Sales page because you logged in as **`zampos129@gmail.com`**, which is a **Super Admin** account with no business attached — so the owner's Sales page has nothing to show it. Log in as `mwilaclement129@gmail.com` and the sales reappear.

### Data safety across Lovable updates (important)

Your client data lives in **Lovable Cloud (Postgres + Storage)**, not in the code. When I push code changes here:
- Tables, rows, and storage files are **untouched**.
- The only thing that ever modifies data is a migration I explicitly write (e.g. `ALTER TABLE`, `DROP COLUMN`).
- I will never drop columns/tables that hold client data without asking you first.
- All migrations are **additive by default** (new columns nullable, new tables only).

So sales, products, debtors, cashier records, logos, and product images persist across every code update.

---

## The 12-priority upgrade — needs to be staged

What you pasted is roughly **3–4 weeks of work** for a real POS team. Trying to ship all of it in one pass will break things and burn credits. I want to deliver it in tight, testable phases so each piece is verified before moving on.

### Phase A — Stability + Money (do first)
1. **Cash Outflow module** (replaces Expenses): Business Expense + Owner Drawings categories, dashboard cards (Sales Revenue / Business Expenses / Owner Drawings / Net Cash Position / Outstanding Debtors / Inventory Value), correct net-profit math.
2. **Debtor management hardening**: enforce status rules (Pending / Partially Paid / Paid / Overdue) via DB trigger so they can't drift; color badges; payment collection already exists — wire it everywhere.
3. **Sales History columns**: invoice number, cashier name + username, department, date/time, payment method, status badge — never anonymous.
4. **Real-time dashboards**: invalidate the dashboard query on every sale / payment / expense / stock change (single `useRealtimeSync` already exists — extend it).

### Phase B — Receipts done properly
5. Rebuild **58mm / 80mm / A4** as **three separate layouts** (not one stretched template). A4 = full invoice with logo, customer block, table, tax summary, signature.
6. **Print Preview** modal that exactly mirrors output.
7. **Receipt Settings** per business (default size, footer, font scale, tax display, logo) saved to `businesses` table.

### Phase C — Hardware + Cashiers
8. **Barcode scanner** upgrades: works in POS, Product Search, Inventory, Stock Receiving, Product Create/Edit. "Not Found" dialog with *Create New* / *Link to Existing*. Add `sku` and `internal_code` columns alongside existing `barcode`; enforce uniqueness per business.
9. **Cashier Activity page**: online status, last login, transactions today, revenue today; click into a cashier profile with performance + activity timeline.

### Phase D — Reports + Audit
10. **Reports hub**: Daily/Monthly Sales, Cash Flow, Inventory Value, Profit, Expenses, Owner Drawings, Cashier Performance, Debtors, Payments, Products, Categories — with PDF / Excel / Print export.
11. **Audit log table** + triggers on sales, payments, expenses, products, stock; viewer page for owners/super admins.
12. **Full app audit**: walk every page, kill placeholders, fix broken buttons, verify every calc.

### Phase E — Polish
13. Quotation tax engine (VAT / Turnover Tax / custom) and PDF layout pass.

---

## What I need from you

**Confirm I should start with Phase A** (Cash Outflow + Debtors + Sales History + real-time dashboards). I'll ship it, you test it on your account, then we move to Phase B.

If you'd rather I start somewhere else (e.g. Receipts first because you're about to demo to a client), tell me which phase to open with.

Nothing in any phase will touch your existing sales, products, debtors, or images.
