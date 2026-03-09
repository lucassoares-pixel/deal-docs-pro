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
import { useDirectSales } from '@/hooks/useDirectSales';
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
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


export default function ReportsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});
  const { dateRange, preset, setPreset, setDateRange, filterByDate } = useDateRangeFilter('month');
  const { contracts } = useContracts();
  const { users } = useUsers();
  const { clients } = useClients();
  const { directSales, updateCost } = useDirectSales();

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
    
    // Prize: tier% on recurring + 10% fixed on setup
    const totalPrize = totalRecurring * 0.6 + totalSetup * 0.10 + directSetup * 0.10;
    const averageTicket = totalSales > 0 ? totalRecurring / totalSales : 0;

    const contractRows = closedSales.map(contract => {
      const client = clients?.find(c => c.id === contract.client_id);
      const seller = sellers.find(s => s.id === contract.seller_id);
      const recurringPrize = (contract.recurring_total_discounted || 0) * 0.6;
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
        prize: recurringPrize + setupPrize
      };
    });

    const directRows = filteredDirectSales.map(sale => {
      const seller = sellers.find(s => s.id === sale.seller_id);
      const setupPrize = (sale.setup_value || 0) * 0.10;
      return {
        id: sale.id,
        date: format(new Date(sale.sale_date), 'dd/MM/yyyy'),
        company: sale.company_name,
        seller: seller?.name || 'N/A',
        type: 'Sem contrato',
        recurring: sale.recurring_value || 0,
        setup: sale.setup_value || 0,
        prizeBase: sale.prize_base || 0,
        prize: setupPrize
      };
    });

    return {
      totalSales: totalSales + filteredDirectSales.length,
      totalRecurring: totalRecurring + directRecurring,
      totalSetup: totalSetup + directSetup,
      totalPrize,
      averageTicket,
      salesData: [...contractRows, ...directRows].sort((a, b) => {
        const da = a.date.split('/').reverse().join('-');
        const db = b.date.split('/').reverse().join('-');
        return db.localeCompare(da);
      })
    };
  }, [filteredContracts, filteredDirectSales, clients, sellers]);

  // Previous period KPIs for comparison
  const prevKpis = useMemo(() => {
    const closedPrev = prevContracts.filter(c => c.sales_status === 'concluido');
    const prevRecurring = closedPrev.reduce((s, c) => s + (c.recurring_total_discounted || 0), 0)
      + prevDirectSales.reduce((s, d) => s + (d.recurring_value || 0), 0);
    const prevSetup = closedPrev.reduce((s, c) => s + (c.setup_total || 0), 0)
      + prevDirectSales.reduce((s, d) => s + (d.setup_value || 0), 0);
    const prevContractRecurring = closedPrev.reduce((s, c) => s + (c.recurring_total_discounted || 0), 0);
    const prevPrize = prevContractRecurring * 0.6 + prevSetup * 0.10;
    const prevTotal = prevContracts.length;
    const prevClosed = closedPrev.length;
    const prevConversion = prevTotal > 0 ? (prevClosed / prevTotal) * 100 : 0;
    return { prevRecurring, prevSetup, prevPrize, prevConversion };
  }, [prevContracts, prevDirectSales]);

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
      
      const recurringTotal = sellerContracts.reduce((sum, contract) => 
        sum + (contract.recurring_total_discounted || 0), 0
      );
      
      const goal = goalsBySeller[seller.id] || 0;
      const achievement = goal > 0 ? (recurringTotal / goal) * 100 : 0;
      const tier = getCommissionTier(achievement);
      const setupTotal = sellerContracts.reduce((sum, contract) => sum + (contract.setup_total || 0), 0);
      const prize = recurringTotal * tier.rate + setupTotal * tier.setupRate;

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
        salesCount: sellerContracts.length,
        missingToNextTier,
        nextTierLabel
      };
    });
  }, [sellers, filteredContracts, goalsBySeller, tiers, isAdmin, profile]);

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
      const revenue = (contract.recurring_total_discounted || 0) + (contract.setup_total || 0);
      // For contracts, we'd need product cost_price - mark as N/A if not available
      // This is a simplification; ideally sum cost_price * qty from contract_products
      return {
        id: contract.id,
        date: format(new Date(contract.start_date), 'dd/MM/yyyy'),
        company: client?.company_name || 'N/A',
        type: 'Contrato' as const,
        revenue,
        cost: null as number | null,
        margin: null as number | null,
        marginPct: null as number | null,
        isDirectSale: false,
      };
    });

    const directRows = filteredDirectSales.map(sale => {
      const revenue = (sale.recurring_value || 0) + (sale.setup_value || 0);
      const cost = sale.cost_value;
      const margin = cost != null ? revenue - cost : null;
      const marginPct = cost != null && revenue > 0 ? ((revenue - cost) / revenue) * 100 : null;
      return {
        id: sale.id,
        date: format(new Date(sale.sale_date), 'dd/MM/yyyy'),
        company: sale.company_name,
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
  }, [filteredContracts, filteredDirectSales, clients]);

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="margin">Margem</TabsTrigger>
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
                  }
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
                        <td colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                          Nenhuma venda encontrada no período
                        </td>
                      </tr>
                    )}
                    {marginData.allRows.map(row => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">{row.date}</td>
                        <td className="py-3 px-2">{row.company}</td>
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
    </AppLayout>
  );
}