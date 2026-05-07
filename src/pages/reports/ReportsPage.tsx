import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { DateRangeFilter, useDateRangeFilter } from '@/components/ui/date-range-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useContracts } from '@/hooks/useContracts';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { useClients } from '@/hooks/useClients';
import { useSellerGoals } from '@/hooks/useSellerGoals';
import { useCommissionTiers } from '@/hooks/useCommissionTiers';
import { useDirectSales, type DirectSale } from '@/hooks/useDirectSales';
import { EditDirectSaleDialog } from '@/components/sales/EditDirectSaleDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { differenceInDays, subDays } from 'date-fns';
import { 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign, 
  Download, 
  PieChart as PieChartIcon,
  BarChart3,
  TrendingDown,
  Percent,
  Save,
  Trash2,
  Pencil
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


export default function ReportsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});
  const [editingSale, setEditingSale] = useState<DirectSale | null>(null);
  const { dateRange, preset, setPreset, setDateRange, filterByDate } = useDateRangeFilter('month');
  const { contracts } = useContracts();
  const { users } = useUsers();
  const { clients } = useClients();
  const { directSales, updateCost, updateDirectSale, deleteDirectSale } = useDirectSales();

  // Get month/year from dateRange for goals lookup
  const selectedMonth = dateRange.from ? dateRange.from.getMonth() + 1 : new Date().getMonth() + 1;
  const selectedYear = dateRange.from ? dateRange.from.getFullYear() : new Date().getFullYear();
  const { goals } = useSellerGoals(selectedMonth, selectedYear);
  const { getCommissionTier, tiers } = useCommissionTiers();

  // For sellers, auto-filter to their own profile
  const effectiveSeller = useMemo(() => {
    if (!isAdmin && profile?.id) return profile.id;
    return selectedSeller;
  }, [isAdmin, profile, selectedSeller]);

  // Map goals by seller_id
  const goalsBySeller = useMemo(() => {
    const result: Record<string, number> = {};
    goals?.forEach((goal) => {
      result[goal.seller_id] = goal.goal_value;
    });
    return result;
  }, [goals]);

  const sellers = useMemo(
    () => users?.filter((user) => user.role === 'sales' && user.active) || [],
    [users],
  );

  const filteredContracts = useMemo(() => {
    let filtered = contracts || [];

    // Filter by date range
    filtered = filterByDate(filtered, (contract) => contract.created_at);

    // Filter by seller if selected (by profile id)
    if (effectiveSeller !== 'all') {
      filtered = filtered.filter((contract) => contract.seller_id === effectiveSeller);
    }

    return filtered;
  }, [contracts, dateRange, effectiveSeller, filterByDate]);

  // Calculate previous period range
  const previousPeriodRange = useMemo(() => {
    const days = differenceInDays(dateRange.to, dateRange.from) + 1;
    return {
      from: subDays(dateRange.from, days),
      to: subDays(dateRange.from, 1),
    };
  }, [dateRange]);

  // Previous period contracts
  const prevContracts = useMemo(() => {
    let filtered = (contracts || []).filter(c => {
      const d = new Date(c.created_at);
      return d >= previousPeriodRange.from && d <= previousPeriodRange.to;
    });
    if (effectiveSeller !== 'all') {
      filtered = filtered.filter(c => c.seller_id === effectiveSeller);
    }
    return filtered;
  }, [contracts, previousPeriodRange, effectiveSeller]);

  // Filter direct sales by date
  const filteredDirectSales = useMemo(() => {
    let filtered = directSales || [];
    filtered = filterByDate(filtered, (sale) => sale.created_at);
    if (effectiveSeller !== 'all') {
      filtered = filtered.filter((sale) => sale.seller_id === effectiveSeller);
    }
    return filtered;
  }, [directSales, dateRange, effectiveSeller, filterByDate]);

  // Previous period direct sales
  const prevDirectSales = useMemo(() => {
    let filtered = (directSales || []).filter(s => {
      const d = new Date(s.created_at);
      return d >= previousPeriodRange.from && d <= previousPeriodRange.to;
    });
    if (effectiveSeller !== 'all') {
      filtered = filtered.filter(s => s.seller_id === effectiveSeller);
    }
    return filtered;
  }, [directSales, previousPeriodRange, effectiveSeller]);

  // Financial Report Data
  const financialData = useMemo(() => {
    const closedSales = filteredContracts.filter(contract => contract.sales_status === 'concluido');
    const totalSales = closedSales.length;
    const totalRecurring = closedSales.reduce((sum, contract) => sum + (contract.recurring_total_discounted || 0), 0);
    const totalSetup = closedSales.reduce((sum, contract) => sum + (contract.setup_total || 0), 0);
    
    // Direct sales totals
    const directRecurring = filteredDirectSales.reduce((sum, s) => sum + (s.recurring_value || 0), 0);
    const directSetup = filteredDirectSales.reduce((sum, s) => sum + (s.setup_value || 0), 0);
    
    const averageTicket = totalSales > 0 ? totalRecurring / totalSales : 0;

    // Helper: get tier rate for a seller based on their goal achievement
    const getSellerTierRate = (sellerId: string) => {
      const sellerContracts = closedSales.filter(c => c.seller_id === sellerId);
      const sellerDirectSales = filteredDirectSales.filter(s => s.seller_id === sellerId);
      const recurringTotal = sellerContracts.reduce((s, c) => s + (c.recurring_total_discounted || 0), 0)
        + sellerDirectSales.reduce((s, d) => s + (d.recurring_value || 0), 0);
      const goal = goals?.find(g => g.seller_id === sellerId)?.goal_value || 0;
      const achievement = goal > 0 ? (recurringTotal / goal) * 100 : 0;
      return getCommissionTier(achievement);
    };

    const contractRows = closedSales.map(contract => {
      const client = clients?.find(c => c.id === contract.client_id);
      const seller = sellers.find(s => s.id === contract.seller_id);
      const tier = getSellerTierRate(contract.seller_id);
      const recurringPrize = (contract.recurring_total_discounted || 0) * tier.rate;
      const setupPrize = (contract.setup_total || 0) * 0.10;
      
      return {
        id: contract.id,
        date: format(new Date(contract.start_date), 'dd/MM/yyyy'),
        company: client?.company_name || 'N/A',
        seller: seller?.name || 'N/A',
        type: 'Contrato',
        recurring: contract.recurring_total_discounted || 0,
        setup: contract.setup_total || 0,
        prizeBase: (contract.recurring_total_discounted || 0) + (contract.setup_total || 0),
        prize: recurringPrize + setupPrize,
        isDirectSale: false
      };
    });

    const directRows = filteredDirectSales.map(sale => {
      const seller = sellers.find(s => s.id === sale.seller_id);
      const tier = sale.seller_id ? getSellerTierRate(sale.seller_id) : { rate: 0, label: 'N/A' };
      const recurringPrize = (sale.recurring_value || 0) * tier.rate;
      const setupPrize = (sale.setup_value || 0) * 0.10;
      return {
        id: sale.id,
        date: format(new Date(sale.sale_date), 'dd/MM/yyyy'),
        company: sale.company_name,
        seller: seller?.name || 'N/A',
        type: 'Sem contrato',
        recurring: sale.recurring_value || 0,
        setup: sale.setup_value || 0,
        prizeBase: (sale.recurring_value || 0) + (sale.setup_value || 0),
        prize: recurringPrize + setupPrize,
        isDirectSale: true
      };
    });

    const allRows = [...contractRows, ...directRows].sort((a, b) => {
      const da = a.date.split('/').reverse().join('-');
      const db = b.date.split('/').reverse().join('-');
      return db.localeCompare(da);
    });

    const totalPrize = allRows.reduce((s, r) => s + r.prize, 0);

    return {
      totalSales: totalSales + filteredDirectSales.length,
      totalRecurring: totalRecurring + directRecurring,
      totalSetup: totalSetup + directSetup,
      totalPrize,
      averageTicket,
      salesData: allRows
    };
  }, [filteredContracts, filteredDirectSales, clients, sellers, goals, getCommissionTier]);

  // Previous period KPIs for comparison
  const prevKpis = useMemo(() => {
    const closedPrev = prevContracts.filter(c => c.sales_status === 'concluido');
    const prevRecurring = closedPrev.reduce((s, c) => s + (c.recurring_total_discounted || 0), 0)
      + prevDirectSales.reduce((s, d) => s + (d.recurring_value || 0), 0);
    const prevSetup = closedPrev.reduce((s, c) => s + (c.setup_total || 0), 0)
      + prevDirectSales.reduce((s, d) => s + (d.setup_value || 0), 0);
    // Use a default mid-tier rate for previous period comparison
    const defaultTier = getCommissionTier(70);
    const prevPrize = prevRecurring * defaultTier.rate + prevSetup * 0.10;
    const prevTotal = prevContracts.length;
    const prevClosed = closedPrev.length;
    const prevConversion = prevTotal > 0 ? (prevClosed / prevTotal) * 100 : 0;
    return { prevRecurring, prevSetup, prevPrize, prevConversion };
  }, [prevContracts, prevDirectSales, getCommissionTier]);

  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? { value: 100, isPositive: true } : { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(parseFloat(change.toFixed(1))), isPositive: change >= 0 };
  };

  // Seller Performance Data
  const sellerPerformanceData = useMemo(() => {
    const sortedTiers = tiers?.slice().sort((a, b) => a.min_percentage - b.min_percentage) || [];
    
    const displaySellers = !isAdmin && profile?.id 
      ? sellers.filter(s => s.id === profile.id) 
      : sellers;

    return displaySellers.map(seller => {
      const sellerContracts = filteredContracts.filter(contract => 
        contract.seller_id === seller.id && contract.sales_status === 'concluido'
      );
      const sellerDirectSales = filteredDirectSales.filter(s => s.seller_id === seller.id);
      
      const contractRecurring = sellerContracts.reduce((sum, contract) => 
        sum + (contract.recurring_total_discounted || 0), 0
      );
      const directRecurring = sellerDirectSales.reduce((sum, s) => sum + (s.recurring_value || 0), 0);
      const recurringTotal = contractRecurring + directRecurring;
      
      const goal = goalsBySeller[seller.id] || 0;
      const achievement = goal > 0 ? (recurringTotal / goal) * 100 : 0;
      const tier = getCommissionTier(achievement);
      
      const contractSetup = sellerContracts.reduce((sum, c) => sum + (c.setup_total || 0), 0);
      const directSetup = sellerDirectSales.reduce((sum, s) => sum + (s.setup_value || 0), 0);
      const setupTotal = contractSetup + directSetup;
      
      // Prize: tier% on recurring + 10% fixed on setup
      const prize = recurringTotal * tier.rate + setupTotal * 0.10;

      // Calculate missing R$ to next tier
      let missingToNextTier = 0;
      let nextTierLabel = '';
      if (goal > 0 && sortedTiers.length > 0) {
        const currentTierIdx = sortedTiers.findIndex(
          t => achievement >= t.min_percentage && achievement <= t.max_percentage
        );
        const nextTier = currentTierIdx >= 0 && currentTierIdx < sortedTiers.length - 1
          ? sortedTiers[currentTierIdx + 1]
          : null;
        if (nextTier) {
          const neededRecurring = (nextTier.min_percentage / 100) * goal;
          missingToNextTier = Math.max(0, neededRecurring - recurringTotal);
          nextTierLabel = nextTier.label;
        }
      }
      
      return {
        id: seller.id,
        name: seller.name,
        goal,
        recurringTotal,
        achievement,
        tier: tier.label,
        prize,
        setupTotal,
        salesCount: sellerContracts.length + sellerDirectSales.length,
        missingToNextTier,
        nextTierLabel
      };
    });
  }, [sellers, filteredContracts, filteredDirectSales, goalsBySeller, tiers, isAdmin, profile]);

  // Conversion Data
  const conversionData = useMemo(() => {
    const totalProposals = filteredContracts.length;
    const closedSales = filteredContracts.filter(contract => contract.sales_status === 'concluido').length;
    const conversionRate = totalProposals > 0 ? (closedSales / totalProposals) * 100 : 0;

    const sellerConversion = sellers.map(seller => {
      const sellerProposals = filteredContracts.filter(contract => contract.seller_id === seller.id);
      const sellerClosed = sellerProposals.filter(contract => contract.sales_status === 'concluido');
      const sellerRate = sellerProposals.length > 0 ? (sellerClosed.length / sellerProposals.length) * 100 : 0;
      
      return {
        id: seller.id,
        name: seller.name,
        proposals: sellerProposals.length,
        closedSales: sellerClosed.length,
        conversionRate: sellerRate
      };
    }).sort((a, b) => b.conversionRate - a.conversionRate);

    return {
      totalProposals,
      closedSales,
      conversionRate,
      sellerConversion
    };
  }, [filteredContracts, sellers]);

  // Margin Data
  const marginData = useMemo(() => {
    const closedContracts = filteredContracts.filter(c => c.sales_status === 'concluido');

    const contractRows = closedContracts.map(contract => {
      const client = clients?.find(c => c.id === contract.client_id);
      const seller = sellers.find(s => s.id === contract.seller_id);
      const revenue = contract.recurring_total_discounted || 0;
      
      // Calculate contract cost from product cost_prices
      const contractCost = contract.products?.reduce((sum, cp) => {
        const productCost = cp.product?.cas_price ?? cp.product?.cost_price ?? 0;
        return sum + (productCost * (cp.quantity || 1));
      }, 0) ?? null;
      
      const hasCost = contractCost != null && contractCost > 0;
      const margin = hasCost ? revenue - contractCost : null;
      const marginPct = hasCost && revenue > 0 ? ((revenue - contractCost) / revenue) * 100 : null;

      // Use sales_status date or start_date as closing date
      const closingDate = contract.updated_at || contract.start_date;

      return {
        id: contract.id,
        date: format(new Date(closingDate), 'dd/MM/yyyy'),
        company: client?.company_name || 'N/A',
        seller: seller?.name || 'N/A',
        type: 'Contrato' as const,
        revenue,
        cost: hasCost ? contractCost : null,
        margin,
        marginPct,
        isDirectSale: false,
      };
    });

    const directRows = filteredDirectSales.map(sale => {
      const seller = sellers.find(s => s.id === sale.seller_id);
      const revenue = sale.recurring_value || 0;
      const cost = sale.cost_value;
      const margin = cost != null ? revenue - cost : null;
      const marginPct = cost != null && revenue > 0 ? ((revenue - cost) / revenue) * 100 : null;
      return {
        id: sale.id,
        date: format(new Date(sale.sale_date), 'dd/MM/yyyy'),
        company: sale.company_name,
        seller: seller?.name || 'N/A',
        type: 'Sem contrato' as const,
        revenue,
        cost,
        margin,
        marginPct,
        isDirectSale: true,
      };
    });

    const allRows = [...contractRows, ...directRows].sort((a, b) => {
      const da = a.date.split('/').reverse().join('-');
      const db = b.date.split('/').reverse().join('-');
      return db.localeCompare(da);
    });

    const totalRevenue = allRows.reduce((s, r) => s + r.revenue, 0);
    const rowsWithCost = allRows.filter(r => r.cost != null);
    const totalCost = rowsWithCost.reduce((s, r) => s + (r.cost || 0), 0);
    const totalMargin = rowsWithCost.reduce((s, r) => s + (r.margin || 0), 0);
    const avgMarginPct = totalRevenue > 0 && rowsWithCost.length > 0
      ? (totalMargin / rowsWithCost.reduce((s, r) => s + r.revenue, 0)) * 100 : 0;

    return { allRows, totalRevenue, totalCost, totalMargin, avgMarginPct };
  }, [filteredContracts, filteredDirectSales, clients, sellers]);

  // Sales grouped by product
  const productSalesData = useMemo(() => {
    if (!isAdmin) return [];
    const closedContracts = filteredContracts.filter(c => c.sales_status === 'concluido');
    type Row = { id: string; date: string; dateRaw: string; cnpj: string; company: string; quantity: number; recurring: number; full: number; seller: string };
    const groups = new Map<string, Row[]>();
    const clientMap = new Map((clients || []).map(c => [c.id, c]));
    const sellerMap = new Map(sellers.map(s => [s.id, s]));

    closedContracts.forEach(contract => {
      const client = clientMap.get(contract.client_id);
      const seller = sellerMap.get(contract.seller_id);
      contract.products?.forEach(cp => {
        const productName = cp.product?.name || 'N/A';
        const row: Row = {
          id: `${contract.id}-${cp.product_id}`,
          date: format(new Date(contract.start_date), 'dd/MM/yyyy'),
          dateRaw: contract.start_date,
          cnpj: client?.cnpj || '',
          company: client?.company_name || 'N/A',
          quantity: cp.quantity || 1,
          recurring: (cp.discounted_price || 0) * (cp.quantity || 1),
          full: (cp.full_price || 0) * (cp.quantity || 1),
          seller: seller?.name || 'N/A',
        };
        if (!groups.has(productName)) groups.set(productName, []);
        groups.get(productName)!.push(row);
      });
    });

    filteredDirectSales.forEach(sale => {
      const seller = sale.seller_id ? sellerMap.get(sale.seller_id) : undefined;
      const row: Row = {
        id: sale.id,
        date: format(new Date(sale.sale_date), 'dd/MM/yyyy'),
        dateRaw: sale.sale_date,
        cnpj: '',
        company: sale.company_name,
        quantity: 1,
        recurring: sale.recurring_value || 0,
        full: sale.recurring_value || 0,
        seller: seller?.name || 'N/A',
      };
      const key = '[Venda Direta]';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([product, rows]) => ({
        product,
        rows: rows.sort((a, b) => b.dateRaw.localeCompare(a.dateRaw)),
        totalQty: rows.reduce((s, r) => s + r.quantity, 0),
        totalRecurring: rows.reduce((s, r) => s + r.recurring, 0),
        totalFull: rows.reduce((s, r) => s + r.full, 0),
      }));
  }, [filteredContracts, filteredDirectSales, clients, sellers, isAdmin]);

  // Discount Data per Seller
  const discountData = useMemo(() => {
    const closedContracts = filteredContracts.filter(c => c.sales_status === 'concluido');

    // Build per-seller discount stats
    const sellerDiscounts = sellers.map(seller => {
      const sellerContracts = closedContracts.filter(c => c.seller_id === seller.id);
      
      let totalFullPrice = 0;
      let totalDiscountedPrice = 0;
      let totalDiscountValue = 0;
      let contractsWithDiscount = 0;
      let productDiscounts: { discount: number; weight: number }[] = [];

      sellerContracts.forEach(contract => {
        const fullPrice = contract.recurring_total_full || 0;
        const discountedPrice = contract.recurring_total_discounted || 0;
        const discountValue = fullPrice - discountedPrice;

        totalFullPrice += fullPrice;
        totalDiscountedPrice += discountedPrice;
        totalDiscountValue += discountValue;

        if (discountValue > 0) {
          contractsWithDiscount++;
        }

        // Collect product-level discounts for weighted average
        contract.products?.forEach(cp => {
          if (cp.discount_percentage > 0) {
            productDiscounts.push({
              discount: cp.discount_percentage,
              weight: cp.full_price * (cp.quantity || 1)
            });
          }
        });
      });

      // Weighted average discount %
      const totalWeight = productDiscounts.reduce((s, p) => s + p.weight, 0);
      const weightedAvgDiscount = totalWeight > 0
        ? productDiscounts.reduce((s, p) => s + (p.discount * p.weight), 0) / totalWeight
        : 0;

      // Simple average discount % based on totals
      const avgDiscountPct = totalFullPrice > 0
        ? ((totalFullPrice - totalDiscountedPrice) / totalFullPrice) * 100
        : 0;

      return {
        id: seller.id,
        name: seller.name,
        totalContracts: sellerContracts.length,
        contractsWithDiscount,
        totalFullPrice,
        totalDiscountedPrice,
        totalDiscountValue,
        avgDiscountPct,
        weightedAvgDiscount
      };
    }).filter(s => s.totalContracts > 0);

    // Global totals
    const globalFullPrice = sellerDiscounts.reduce((s, d) => s + d.totalFullPrice, 0);
    const globalDiscountedPrice = sellerDiscounts.reduce((s, d) => s + d.totalDiscountedPrice, 0);
    const globalDiscountValue = sellerDiscounts.reduce((s, d) => s + d.totalDiscountValue, 0);
    const globalAvgDiscountPct = globalFullPrice > 0
      ? ((globalFullPrice - globalDiscountedPrice) / globalFullPrice) * 100
      : 0;
    const totalContractsWithDiscount = sellerDiscounts.reduce((s, d) => s + d.contractsWithDiscount, 0);

    return {
      sellerDiscounts,
      globalFullPrice,
      globalDiscountedPrice,
      globalDiscountValue,
      globalAvgDiscountPct,
      totalContractsWithDiscount
    };
  }, [filteredContracts, sellers]);

  const handleSaveCost = useCallback((saleId: string) => {
    const val = editingCosts[saleId];
    if (val === undefined) return;
    const parsed = parseFloat(val.replace(',', '.'));
    if (isNaN(parsed)) return;
    updateCost.mutate({ id: saleId, cost_value: parsed });
    setEditingCosts(prev => {
      const next = { ...prev };
      delete next[saleId];
      return next;
    });
  }, [editingCosts, updateCost]);

  const exportToCSV = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title={isAdmin ? "Relatórios" : "Meus Resultados"}
          subtitle={isAdmin ? "Análise detalhada de performance e vendas" : "Acompanhe seus números e performance"}
        />

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Período</label>
              <DateRangeFilter
                value={dateRange}
                onChange={setDateRange}
                preset={preset}
                onPresetChange={setPreset}
              />
            </div>
            
            {isAdmin && (
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium mb-2">Vendedor</label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os vendedores</SelectItem>
                      {sellers.map(seller => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Recorrente"
          value={`R$ ${financialData.totalRecurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend={calcTrend(financialData.totalRecurring, prevKpis.prevRecurring)}
        />
        <StatCard
          title="Implantação"
          value={`R$ ${financialData.totalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend={calcTrend(financialData.totalSetup, prevKpis.prevSetup)}
        />
        <StatCard
          title="Premiação Total"
          value={`R$ ${financialData.totalPrize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Target}
          trend={calcTrend(financialData.totalPrize, prevKpis.prevPrize)}
        />
        <StatCard
          title="Conversão"
          value={`${conversionData.conversionRate.toFixed(1)}%`}
          icon={TrendingUp}
          trend={calcTrend(conversionData.conversionRate, prevKpis.prevConversion)}
        />
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          {isAdmin && <TabsTrigger value="products">Produtos</TabsTrigger>}
          <TabsTrigger value="margin">Margem</TabsTrigger>
          <TabsTrigger value="discounts">Descontos</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
        </TabsList>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Vendas Fechadas"
              value={financialData.totalSales.toString()}
              icon={Target}
            />
            <StatCard
              title="Recorrência Total"
              value={`R$ ${financialData.totalRecurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
            />
            <StatCard
              title="Implantação Total"
              value={`R$ ${financialData.totalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
            />
            <StatCard
              title="Premiação Gerada"
              value={`R$ ${financialData.totalPrize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={Users}
            />
            <StatCard
              title="Ticket Médio"
              value={`R$ ${financialData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={BarChart3}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vendas Realizadas</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV(financialData.salesData, 'vendas-realizadas')}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'date', header: 'Data' },
                  { key: 'company', header: 'Cliente' },
                  { key: 'type', header: 'Tipo' },
                  { 
                    key: 'recurring', 
                    header: 'Recorrência',
                    render: (item) => `R$ ${item.recurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  },
                  { 
                    key: 'setup', 
                    header: 'Implantação',
                    render: (item) => `R$ ${item.setup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  },
                  { 
                    key: 'prizeBase', 
                    header: 'Base do Prêmio',
                    render: (item) => `R$ ${item.prizeBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  },
                  { 
                    key: 'prize', 
                    header: 'Prêmio',
                    render: (item) => `R$ ${item.prize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  },
                  ...(isAdmin ? [{
                    key: 'actions' as const,
                    header: 'Ações',
                    render: (item: any) => item.isDirectSale ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const sale = directSales?.find(s => s.id === item.id);
                            if (sale) setEditingSale(sale);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a venda de "{item.company}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDirectSale.mutate(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : null
                  }] : [])
                ]}
                data={financialData.salesData}
                keyExtractor={(item) => item.id}
                emptyMessage="Nenhuma venda encontrada no período"
              />
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sellerPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Recorrência']}
                    />
                    <Bar dataKey="recurringTotal" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recorrência vs Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sellerPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]}
                    />
                    <Bar dataKey="goal" fill="hsl(var(--muted))" name="Meta" />
                    <Bar dataKey="recurringTotal" fill="hsl(var(--primary))" name="Recorrência" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Report */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vendas por Produto</CardTitle>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const flat = productSalesData.flatMap(g =>
                    g.rows.map(r => ({
                      produto: g.product,
                      data: r.date,
                      cnpj: r.cnpj,
                      cliente: r.company,
                      qtd: r.quantity,
                      valor_mensal: r.recurring.toFixed(2),
                      valor_cheio: r.full.toFixed(2),
                      vendedor: r.seller,
                    }))
                  );
                  if (flat.length > 0) exportToCSV(flat, 'vendas-por-produto');
                }}
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {productSalesData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma venda no período</p>
              ) : (
                <div className="space-y-6">
                  {productSalesData.map(group => (
                    <div key={group.product} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-3 flex items-center justify-between">
                        <h3 className="font-semibold">{group.product}</h3>
                        <span className="text-sm text-muted-foreground">
                          {group.rows.length} venda(s) • R$ {group.totalRecurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left py-2 px-3 font-medium">Data</th>
                              <th className="text-left py-2 px-3 font-medium">CNPJ</th>
                              <th className="text-left py-2 px-3 font-medium">Cliente</th>
                              <th className="text-center py-2 px-3 font-medium">Qtd</th>
                              <th className="text-right py-2 px-3 font-medium">Valor Mensal</th>
                              <th className="text-right py-2 px-3 font-medium">Valor Cheio</th>
                              <th className="text-left py-2 px-3 font-medium">Vendedor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map(r => (
                              <tr key={r.id} className="border-b hover:bg-muted/30">
                                <td className="py-2 px-3">{r.date}</td>
                                <td className="py-2 px-3">{r.cnpj}</td>
                                <td className="py-2 px-3">{r.company}</td>
                                <td className="py-2 px-3 text-center">{r.quantity}</td>
                                <td className="py-2 px-3 text-right">R$ {r.recurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 px-3 text-right">R$ {r.full.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 px-3">{r.seller}</td>
                              </tr>
                            ))}
                            <tr className="bg-muted/50 font-semibold">
                              <td className="py-2 px-3" colSpan={3}>Subtotal</td>
                              <td className="py-2 px-3 text-center">{group.totalQty}</td>
                              <td className="py-2 px-3 text-right">R$ {group.totalRecurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-2 px-3 text-right">R$ {group.totalFull.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Margin Report */}
        <TabsContent value="margin" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Receita Total"
              value={`R$ ${marginData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
            />
            <StatCard
              title="Custo Total"
              value={`R$ ${marginData.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingDown}
            />
            <StatCard
              title="Margem Total"
              value={`R$ ${marginData.totalMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
            />
            <StatCard
              title="Margem Média"
              value={`${marginData.avgMarginPct.toFixed(1)}%`}
              icon={Percent}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Margem por Venda</CardTitle>
              {marginData.allRows.length > 0 && (
                <Button 
                  variant="outline" 
                   onClick={() => exportToCSV(marginData.allRows.map(r => ({
                    data: r.date,
                    empresa: r.company,
                    vendedor: r.seller,
                    tipo: r.type,
                    receita: r.revenue,
                    custo: r.cost ?? '',
                    margem: r.margin ?? '',
                    margem_pct: r.marginPct != null ? `${r.marginPct.toFixed(1)}%` : ''
                  })), 'margem-vendas')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                   <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Data</th>
                      <th className="text-left py-3 px-2 font-medium">Cliente</th>
                      <th className="text-left py-3 px-2 font-medium">Vendedor</th>
                      <th className="text-left py-3 px-2 font-medium">Tipo</th>
                      <th className="text-right py-3 px-2 font-medium">Receita</th>
                      <th className="text-right py-3 px-2 font-medium">Custo</th>
                      <th className="text-right py-3 px-2 font-medium">Margem</th>
                      <th className="text-right py-3 px-2 font-medium">Margem %</th>
                      {isAdmin && <th className="text-center py-3 px-2 font-medium w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {marginData.allRows.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">
                          Nenhuma venda encontrada no período
                        </td>
                      </tr>
                    )}
                    {marginData.allRows.map(row => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">{row.date}</td>
                        <td className="py-3 px-2">{row.company}</td>
                        <td className="py-3 px-2">{row.seller}</td>
                        <td className="py-3 px-2">{row.type}</td>
                        <td className="py-3 px-2 text-right">
                          R$ {row.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {isAdmin && row.isDirectSale ? (
                            <Input
                              className="w-28 h-8 text-right ml-auto"
                              placeholder="0,00"
                              value={editingCosts[row.id] ?? (row.cost != null ? row.cost.toString().replace('.', ',') : '')}
                              onChange={(e) => setEditingCosts(prev => ({ ...prev, [row.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveCost(row.id)}
                            />
                          ) : (
                            row.cost != null
                              ? `R$ ${row.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {row.margin != null
                            ? <span className={row.margin >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                                R$ {row.margin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                        <td className="py-3 px-2 text-right">
                          {row.marginPct != null
                            ? <span className={row.marginPct >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                                {row.marginPct.toFixed(1)}%
                              </span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-2 text-center">
                            {row.isDirectSale && editingCosts[row.id] !== undefined && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleSaveCost(row.id)}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discount Report */}
        <TabsContent value="discounts" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Desconto Médio Geral"
              value={`${discountData.globalAvgDiscountPct.toFixed(1)}%`}
              icon={Percent}
            />
            <StatCard
              title="Total Desconto Concedido"
              value={`R$ ${discountData.globalDiscountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingDown}
            />
            <StatCard
              title="Receita Cheia (Tabela)"
              value={`R$ ${discountData.globalFullPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
            />
            <StatCard
              title="Contratos c/ Desconto"
              value={discountData.totalContractsWithDiscount.toString()}
              icon={Target}
            />
          </div>

          {/* Per-seller table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Desconto por Vendedor</CardTitle>
              {discountData.sellerDiscounts.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(discountData.sellerDiscounts.map(s => ({
                    vendedor: s.name,
                    contratos: s.totalContracts,
                    contratos_com_desconto: s.contractsWithDiscount,
                    valor_tabela: s.totalFullPrice.toFixed(2),
                    valor_vendido: s.totalDiscountedPrice.toFixed(2),
                    total_desconto: s.totalDiscountValue.toFixed(2),
                    desconto_medio_pct: `${s.avgDiscountPct.toFixed(1)}%`
                  })), 'desconto-por-vendedor')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Vendedor</th>
                      <th className="text-right py-3 px-2 font-medium">Contratos</th>
                      <th className="text-right py-3 px-2 font-medium">c/ Desconto</th>
                      <th className="text-right py-3 px-2 font-medium">Valor Tabela</th>
                      <th className="text-right py-3 px-2 font-medium">Valor Vendido</th>
                      <th className="text-right py-3 px-2 font-medium">Desconto R$</th>
                      <th className="text-right py-3 px-2 font-medium">Desconto %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discountData.sellerDiscounts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum dado encontrado no período
                        </td>
                      </tr>
                    )}
                    {discountData.sellerDiscounts
                      .sort((a, b) => b.avgDiscountPct - a.avgDiscountPct)
                      .map(seller => (
                      <tr key={seller.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{seller.name}</td>
                        <td className="py-3 px-2 text-right">{seller.totalContracts}</td>
                        <td className="py-3 px-2 text-right">{seller.contractsWithDiscount}</td>
                        <td className="py-3 px-2 text-right">
                          R$ {seller.totalFullPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          R$ {seller.totalDiscountedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right text-destructive font-medium">
                          - R$ {seller.totalDiscountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={`font-semibold px-2 py-1 rounded-full text-xs ${
                            seller.avgDiscountPct === 0
                              ? 'bg-muted text-muted-foreground'
                              : seller.avgDiscountPct <= 10
                              ? 'bg-emerald-100 text-emerald-700'
                              : seller.avgDiscountPct <= 20
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {seller.avgDiscountPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {discountData.sellerDiscounts.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-semibold bg-muted/30">
                        <td className="py-3 px-2">Total</td>
                        <td className="py-3 px-2 text-right">
                          {discountData.sellerDiscounts.reduce((s, d) => s + d.totalContracts, 0)}
                        </td>
                        <td className="py-3 px-2 text-right">{discountData.totalContractsWithDiscount}</td>
                        <td className="py-3 px-2 text-right">
                          R$ {discountData.globalFullPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          R$ {discountData.globalDiscountedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right text-destructive">
                          - R$ {discountData.globalDiscountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-primary">
                          {discountData.globalAvgDiscountPct.toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Desconto Médio por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={discountData.sellerDiscounts.sort((a, b) => b.avgDiscountPct - a.avgDiscountPct)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Desconto Médio']}
                  />
                  <Bar dataKey="avgDiscountPct" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sellerPerformanceData.map(seller => (
                  <div key={seller.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{seller.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {seller.salesCount} vendas no período
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Faixa: {seller.tier}</p>
                        <p className="text-lg font-bold text-primary">
                          {seller.achievement.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span>Meta: R$ {seller.goal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span>Vendido: R$ {seller.recurringTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <Progress value={Math.min(seller.achievement, 100)} className="h-2" />
                      {seller.missingToNextTier > 0 && (
                        <p className="text-xs font-medium text-amber-600">
                          Falta R$ {seller.missingToNextTier.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para a faixa {seller.nextTierLabel}
                        </p>
                      )}
                      {seller.missingToNextTier === 0 && seller.achievement >= 100 && (
                        <p className="text-xs font-medium text-emerald-600">
                          🏆 Faixa máxima atingida!
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Premiação</p>
                        <p className="font-semibold">R$ {seller.prize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Atingimento</p>
                        <p className="font-semibold">{seller.achievement.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Faixa</p>
                        <p className="font-semibold">{seller.tier}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversion Report */}
        <TabsContent value="conversion" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total de Propostas"
              value={conversionData.totalProposals.toString()}
              icon={PieChartIcon}
            />
            <StatCard
              title="Vendas Fechadas"
              value={conversionData.closedSales.toString()}
              icon={Target}
            />
            <StatCard
              title="Taxa de Conversão"
              value={`${conversionData.conversionRate.toFixed(1)}%`}
              icon={conversionData.conversionRate > 25 ? TrendingUp : TrendingDown}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversão por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'name', header: 'Vendedor' },
                  { key: 'proposals', header: 'Propostas' },
                  { key: 'closedSales', header: 'Vendas' },
                  { 
                    key: 'conversionRate', 
                    header: 'Conversão %',
                    render: (item) => `${item.conversionRate.toFixed(1)}%`
                  }
                ]}
                data={conversionData.sellerConversion}
                keyExtractor={(item) => item.id}
                emptyMessage="Nenhum dado de conversão encontrado"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gráfico de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionData.sellerConversion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Conversão']}
                  />
                  <Bar dataKey="conversionRate" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Edit Direct Sale Dialog */}
      <EditDirectSaleDialog
        sale={editingSale}
        open={!!editingSale}
        onOpenChange={(open) => { if (!open) setEditingSale(null); }}
        sellers={sellers}
        isPending={updateDirectSale.isPending}
        onSave={(data) => {
          updateDirectSale.mutateAsync(data).then(() => setEditingSale(null));
        }}
      />
    </AppLayout>
  );
}