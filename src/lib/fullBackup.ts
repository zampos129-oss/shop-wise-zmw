import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Full data backup / migration export.
//
// Produces a single JSON file containing EVERYTHING belonging to a business
// (or to every business, for super admins) so the data can be re-imported
// into another system without anything being lost.
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = 'zampos-full-backup';
export const BACKUP_VERSION = 1;

type Row = Record<string, unknown>;

const PAGE = 1000;

/** Fetch every row of a table for one business, paginated. */
const fetchAllByBusiness = async (table: string, businessId: string): Promise<Row[]> => {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table as never)
      .select('*')
      .eq('business_id', businessId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data as Row[] | null) || [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
};

/** Fetch child rows whose foreign key is in a list of parent ids. */
const fetchAllByParent = async (table: string, column: string, parentIds: string[]): Promise<Row[]> => {
  const out: Row[] = [];
  for (let i = 0; i < parentIds.length; i += 100) {
    const chunk = parentIds.slice(i, i + 100);
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from(table as never)
      .select('*')
      .in(column, chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(((data as Row[] | null) || [])));
  }
  return out;
};

const ids = (rows: Row[]) => rows.map((r) => String(r.id));

export type BusinessBackup = {
  business: Row | null;
  product_categories: Row[];
  products: Row[];
  business_cashiers: Row[];
  sales: Row[];
  sale_payments: Row[];
  debtors: Row[];
  debtor_payments: Row[];
  expenses: Row[];
  quotations: Row[];
  quotation_items: Row[];
  delivery_notes: Row[];
  delivery_note_items: Row[];
  payments: Row[];
  stock_adjustment_requests: Row[];
  counts: Record<string, number>;
};

/** Collect all data for a single business. */
export const collectBusinessBackup = async (businessId: string): Promise<BusinessBackup> => {
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .maybeSingle();

  const [
    product_categories,
    products,
    business_cashiers,
    sales,
    sale_payments,
    debtors,
    expenses,
    quotations,
    delivery_notes,
    payments,
    stock_adjustment_requests,
  ] = await Promise.all([
    fetchAllByBusiness('product_categories', businessId),
    fetchAllByBusiness('products', businessId),
    fetchAllByBusiness('business_cashiers', businessId),
    fetchAllByBusiness('sales', businessId),
    fetchAllByBusiness('sale_payments', businessId),
    fetchAllByBusiness('debtors', businessId),
    fetchAllByBusiness('expenses', businessId),
    fetchAllByBusiness('quotations', businessId),
    fetchAllByBusiness('delivery_notes', businessId),
    fetchAllByBusiness('payments', businessId).catch(() => [] as Row[]),
    fetchAllByBusiness('stock_adjustment_requests', businessId).catch(() => [] as Row[]),
  ]);

  const [quotation_items, delivery_note_items, debtor_payments] = await Promise.all([
    fetchAllByParent('quotation_items', 'quotation_id', ids(quotations)),
    fetchAllByParent('delivery_note_items', 'delivery_note_id', ids(delivery_notes)),
    fetchAllByParent('debtor_payments', 'debtor_id', ids(debtors)),
  ]);

  const backup: Omit<BusinessBackup, 'counts'> = {
    business: (business as Row) || null,
    product_categories,
    products,
    business_cashiers,
    sales,
    sale_payments,
    debtors,
    debtor_payments,
    expenses,
    quotations,
    quotation_items,
    delivery_notes,
    delivery_note_items,
    payments,
    stock_adjustment_requests,
  };

  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(backup)) {
    if (Array.isArray(value)) counts[key] = value.length;
  }

  return { ...backup, counts };
};

const downloadJson = (payload: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Download a complete backup for one business. */
export const downloadBusinessBackup = async (businessId: string, businessName?: string) => {
  const data = await collectBusinessBackup(businessId);
  const slug = (businessName || 'business').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  downloadJson(
    {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      scope: 'single-business',
      businesses: [data],
    },
    `zampos-backup-${slug}`,
  );
  return data.counts;
};

/** Download a complete backup for every business (super admin). */
export const downloadAllBusinessesBackup = async () => {
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const list = (businesses as { id: string; name: string }[] | null) || [];
  const collected: BusinessBackup[] = [];
  for (const b of list) {
    collected.push(await collectBusinessBackup(b.id));
  }

  const [{ data: profiles }, { data: roles }, { data: affiliates }] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('user_roles').select('*'),
    supabase.from('affiliates').select('*'),
  ]);

  downloadJson(
    {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      scope: 'all-businesses',
      business_count: collected.length,
      accounts: { profiles: profiles || [], user_roles: roles || [], affiliates: affiliates || [] },
      businesses: collected,
    },
    'zampos-full-backup-all-clients',
  );

  return collected.length;
};
