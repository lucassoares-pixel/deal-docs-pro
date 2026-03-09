import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSellerGoals } from '@/hooks/useSellerGoals';
import { useUsers } from '@/hooks/useUsers';
import { useContracts } from '@/hooks/useContracts';
import { Save, Target, TrendingUp, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

export default function GoalsPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editedGoals, setEditedGoals] = useState<Record<string, number>>({});

  const { goals, isLoading, upsertGoal } = useSellerGoals(selectedMonth, selectedYear);
  const { users } = useUsers();
  const { contracts } = useContracts();

  const sellers = useMemo(
    () => users?.filter((user) => user.role === 'sales' && user.active) || [],
    [users]
  );

  // Calculate sales per seller for the selected month/year
  const salesBySeller = useMemo(() => {
    const result: Record<string, number> = {};
    
    contracts?.forEach((contract) => {
      if (contract.sales_status !== 'concluido') return;
      
      const contractDate = new Date(contract.start_date);
      const contractMonth = contractDate.getMonth() + 1;
      const contractYear = contractDate.getFullYear();
      
      if (contractMonth === selectedMonth && contractYear === selectedYear) {
        const sellerId = contract.seller_id;
        result[sellerId] = (result[sellerId] || 0) + (contract.recurring_total_discounted || 0);
      }
    });
    
    return result;
  }, [contracts, selectedMonth, selectedYear]);

  // Map goals by seller_id
  const goalsBySeller = useMemo(() => {
    const result: Record<string, number> = {};
    goals?.forEach((goal) => {
      result[goal.seller_id] = goal.goal_value;
    });
    return result;
  }, [goals]);

  const handleGoalChange = (sellerId: string, value: string) => {
    const numValue = parseFloat(value.replace(/\D/g, '')) / 100 || 0;
    setEditedGoals((prev) => ({ ...prev, [sellerId]: numValue }));
  };

  const handleSaveGoal = async (sellerId: string) => {
    const goalValue = editedGoals[sellerId];
    if (goalValue === undefined) return;

    await upsertGoal.mutateAsync({
      seller_id: sellerId,
      month: selectedMonth,
      year: selectedYear,
      goal_value: goalValue,
    });

    setEditedGoals((prev) => {
      const newEdited = { ...prev };
      delete newEdited[sellerId];
      return newEdited;
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calculate summary stats
  const totalGoal = sellers.reduce((sum, seller) => {
    return sum + (editedGoals[seller.id] ?? goalsBySeller[seller.id] ?? 0);
  }, 0);

  const totalSales = Object.values(salesBySeller).reduce((sum, v) => sum + v, 0);
  const overallAchievement = totalGoal > 0 ? (totalSales / totalGoal) * 100 : 0;

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title="Metas Mensais"
          subtitle="Defina e acompanhe as metas de vendas por vendedor"
        />

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Mês</label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Ano</label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Meta Total"
            value={formatCurrency(totalGoal)}
            icon={Target}
          />
          <StatCard
            title="Vendas Realizadas"
            value={formatCurrency(totalSales)}
            icon={TrendingUp}
          />
          <StatCard
            title="Atingimento Geral"
            value={`${overallAchievement.toFixed(1)}%`}
            icon={Users}
            trend={{
              value: overallAchievement,
              isPositive: overallAchievement >= 100,
            }}
          />
        </div>

        {/* Goals Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Metas - {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : sellers.length === 0 ? (
              <p className="text-muted-foreground">Nenhum vendedor ativo encontrado.</p>
            ) : (
              <div className="space-y-6">
                {sellers.map((seller) => {
                  const currentGoal = editedGoals[seller.id] ?? goalsBySeller[seller.id] ?? 0;
                  const sales = salesBySeller[seller.id] || 0;
                  const achievement = currentGoal > 0 ? (sales / currentGoal) * 100 : 0;
                  const hasChanges = editedGoals[seller.id] !== undefined;

                  return (
                    <div
                      key={seller.id}
                      className="p-4 border rounded-lg space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{seller.name}</h3>
                          <p className="text-sm text-muted-foreground">{seller.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              R$
                            </span>
                            <Input
                              type="text"
                              value={currentGoal.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              onChange={(e) => handleGoalChange(seller.id, e.target.value)}
                              className="pl-10 w-40"
                              placeholder="0,00"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSaveGoal(seller.id)}
                            disabled={!hasChanges || upsertGoal.isPending}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Vendido: {formatCurrency(sales)}
                          </span>
                          <span
                            className={
                              achievement >= 100
                                ? 'text-green-600 font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {achievement.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={Math.min(achievement, 100)} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
