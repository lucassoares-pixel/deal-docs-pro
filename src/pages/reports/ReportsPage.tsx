import { useState, useMemo } from 'react';
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
import { useClients } from '@/hooks/useClients';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign, 
  Download, 
  PieChart as PieChartIcon,
  BarChart3,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Commission tiers
const COMMISSION_TIERS = [
  { min: 0, max: 50, rate: 0.5, label: '50%' },
  { min: 51, max: 85, rate: 0.6, label: '60%' },
  { min: 86, max: Infinity, rate: 0.7, label: '70%' }
];

const getCommissionTier = (percentage: number) => {
  return COMMISSION_TIERS.find(tier => percentage >= tier.min && percentage <= tier.max) || COMMISSION_TIERS[0];
};

export default function ReportsPage() {
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const { dateRange, preset, setPreset, setDateRange, filterByDate } = useDateRangeFilter('month');
  const { contracts } = useContracts();
  const { users } = useUsers();
  const { clients } = useClients();

  const sellers = useMemo(
    () => users?.filter((user) => user.role === 'sales' && user.active) || [],
    [users],
  );

  const filteredContracts = useMemo(() => {
    let filtered = contracts || [];

    // Filter by date range
    filtered = filterByDate(filtered, (contract) => contract.created_at);

    // Filter by seller if selected (by profile id)
    if (selectedSeller !== 'all') {
      filtered = filtered.filter((contract) => contract.seller_id === selectedSeller);
    }

    return filtered;
  }, [contracts, dateRange, selectedSeller, filterByDate]);

  // Financial Report Data
  const financialData = useMemo(() => {
    const closedSales = filteredContracts.filter(contract => contract.signed);
    const totalSales = closedSales.length;
    const totalRecurring = closedSales.reduce((sum, contract) => sum + (contract.recurring_total_discounted || 0), 0);
    const totalSetup = closedSales.reduce((sum, contract) => sum + (contract.setup_total || 0), 0);
    
    // Calculate commission (using 60% as base rate for now)
    const totalCommission = totalRecurring * 0.6;
    const averageTicket = totalSales > 0 ? totalRecurring / totalSales : 0;

    return {
      totalSales,
      totalRecurring,
      totalSetup,
      totalCommission,
      averageTicket,
      salesData: closedSales.map(contract => {
        const client = clients?.find(c => c.id === contract.client_id);
        const seller = sellers.find(s => s.id === contract.seller_id);
        const commission = (contract.recurring_total_discounted || 0) * 0.6;
        
        return {
          id: contract.id,
          date: format(new Date(contract.start_date), 'dd/MM/yyyy'),
          company: client?.company_name || 'N/A',
          seller: seller?.name || 'N/A',
          recurring: contract.recurring_total_discounted || 0,
          setup: contract.setup_total || 0,
          commission
        };
      })
    };
  }, [filteredContracts, clients, sellers]);

  // Seller Performance Data
  const sellerPerformanceData = useMemo(() => {
    return sellers.map(seller => {
      const sellerContracts = filteredContracts.filter(contract => 
        contract.seller_id === seller.id && contract.signed
      );
      
      const recurringTotal = sellerContracts.reduce((sum, contract) => 
        sum + (contract.recurring_total_discounted || 0), 0
      );
      
      // Using a base goal of R$ 10,000 per seller (this could come from database)
      const goal = 10000;
      const achievement = goal > 0 ? (recurringTotal / goal) * 100 : 0;
      const tier = getCommissionTier(achievement);
      const commission = recurringTotal * tier.rate;
      
      return {
        id: seller.id,
        name: seller.name,
        goal,
        recurringTotal,
        achievement,
        tier: tier.label,
        commission,
        salesCount: sellerContracts.length
      };
    });
  }, [sellers, filteredContracts]);

  // Conversion Data
  const conversionData = useMemo(() => {
    const totalProposals = filteredContracts.length;
    const closedSales = filteredContracts.filter(contract => contract.signed).length;
    const conversionRate = totalProposals > 0 ? (closedSales / totalProposals) * 100 : 0;

    const sellerConversion = sellers.map(seller => {
      const sellerProposals = filteredContracts.filter(contract => contract.seller_id === seller.id);
      const sellerClosed = sellerProposals.filter(contract => contract.signed);
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
          title="Relatórios"
          subtitle="Análise detalhada de performance e vendas"
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
            
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium mb-2">Vendedor</label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {sellers.map(seller => (
                    <SelectItem key={seller.id} value={seller.user_id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Recorrente"
          value={`R$ ${financialData.totalRecurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Implantação"
          value={`R$ ${financialData.totalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="Comissão Total"
          value={`R$ ${financialData.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Target}
          trend={{ value: 15.3, isPositive: true }}
        />
        <StatCard
          title="Conversão"
          value={`${conversionData.conversionRate.toFixed(1)}%`}
          icon={TrendingUp}
          trend={{ value: conversionData.conversionRate > 25 ? 5.2 : -2.1, isPositive: conversionData.conversionRate > 25 }}
        />
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="financial">Financeiro Mensal</TabsTrigger>
          <TabsTrigger value="goals">Meta por Vendedor</TabsTrigger>
          <TabsTrigger value="conversion">Conversão Comercial</TabsTrigger>
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
              title="Comissão Gerada"
              value={`R$ ${financialData.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
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
                  { key: 'company', header: 'Empresa' },
                  { key: 'seller', header: 'Vendedor' },
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
                    key: 'commission', 
                    header: 'Comissão',
                    render: (item) => `R$ ${item.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
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

        {/* Goals Report */}
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
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Comissão</p>
                        <p className="font-semibold">R$ {seller.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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