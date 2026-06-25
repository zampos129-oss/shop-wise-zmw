import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatZMW } from '@/lib/currency';
import { TrendingUp, ShoppingCart, AlertTriangle, PackageX } from 'lucide-react';

interface DashboardStatsProps {
  businessId: string;
  isService: boolean;
}

interface Stats {
  todayRevenue: number;
  todaySalesCount: number;
  outstandingDebts: number;
  lowStockCount: number;
}

const DashboardStats = ({ businessId, isService }: DashboardStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    todayRevenue: 0,
    todaySalesCount: 0,
    outstandingDebts: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];

      const [salesRes, debtorsRes, productsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('total')
          .eq('business_id', businessId)
          .eq('status', 'completed')
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`),
        supabase
          .from('debtors')
          .select('amount_owed, amount_paid')
          .eq('business_id', businessId)
          .neq('status', 'paid'),
        isService
          ? Promise.resolve({ data: [] })
          : supabase
              .from('products')
              .select('id')
              .eq('business_id', businessId)
              .eq('is_active', true)
              .filter('stock', 'lte', 'minimum_stock' as any),
      ]);

      const sales = salesRes.data || [];
      const debtors = debtorsRes.data || [];

      // For low stock, we need a different approach since we can't compare columns directly
      let lowStockCount = 0;
      if (!isService) {
        const { data: products } = await supabase
          .from('products')
          .select('stock, minimum_stock')
          .eq('business_id', businessId)
          .eq('is_active', true);
        lowStockCount = (products || []).filter(p => p.stock <= p.minimum_stock).length;
      }

      setStats({
        todayRevenue: sales.reduce((sum, s) => sum + Number(s.total), 0),
        todaySalesCount: sales.length,
        outstandingDebts: debtors.reduce((sum, d) => sum + (Number(d.amount_owed) - Number(d.amount_paid)), 0),
        lowStockCount,
      });
      setLoading(false);
    };

    fetchStats();
  }, [businessId, isService]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Revenue",
      value: formatZMW(stats.todayRevenue),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: "Sales Today",
      value: stats.todaySalesCount.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
    {
      label: "Outstanding Debts",
      value: formatZMW(stats.outstandingDebts),
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    ...(!isService
      ? [{
          label: "Low Stock Items",
          value: stats.lowStockCount.toString(),
          icon: PackageX,
          color: 'text-red-600',
          bg: 'bg-red-500/10',
        }]
      : []),
  ];

  return (
    <div className={`grid ${isService ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border bg-card p-3 flex items-start gap-3"
        >
          <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
            <p className="text-sm font-bold truncate">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
