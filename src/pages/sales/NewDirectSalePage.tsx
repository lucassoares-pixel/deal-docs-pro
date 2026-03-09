import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDirectSales } from '@/hooks/useDirectSales';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';

export default function NewDirectSalePage() {
  const { profile } = useAuth();
  const { users } = useUsers();
  const sellers = useMemo(
    () => users?.filter(u => u.role === 'sales' && u.active) || [],
    [users]
  );

  const [companyName, setCompanyName] = useState('');
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [recurringValue, setRecurringValue] = useState('');
  const [setupValue, setSetupValue] = useState('');
  const [sellerId, setSellerId] = useState(profile?.id || '');
  const { createDirectSale } = useDirectSales();

  const parseCurrency = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const formatCurrency = (value: string) => {
    const num = parseCurrency(value);
    if (value === '' || value === '0') return '';
    return value;
  };

  const recurring = parseCurrency(recurringValue);
  const setup = parseCurrency(setupValue);
  const setupPrize = setup * 0.10;

  const handleSubmit = async () => {
    if (!companyName.trim() || !sellerId) return;

    await createDirectSale.mutateAsync({
      company_name: companyName.trim(),
      sale_date: format(saleDate, 'yyyy-MM-dd'),
      recurring_value: recurring,
      setup_value: setup,
      seller_id: sellerId,
    });

    // Clear form
    setCompanyName('');
    setSaleDate(new Date());
    setRecurringValue('');
    setSetupValue('');
    setSellerId(profile?.id || '');
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-2xl">
        <PageHeader
          title="➕ Nova Venda"
          subtitle="Registrar venda rápida sem contrato"
        />

        <Card>
          <CardHeader>
            <CardTitle>Dados da Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Vendedor */}
            <div className="space-y-2">
              <Label>Vendedor Responsável</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map(seller => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Razão Social */}
            <div className="space-y-2">
              <Label htmlFor="company">Razão Social</Label>
              <Input
                id="company"
                placeholder="Nome da empresa..."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label>Data da Venda</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !saleDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {saleDate ? format(saleDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={saleDate}
                    onSelect={(d) => d && setSaleDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurring">Recorrência / Mensalidade (R$)</Label>
                <Input
                  id="recurring"
                  placeholder="0,00"
                  value={recurringValue}
                  onChange={(e) => setRecurringValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup">Implantação (R$)</Label>
                <Input
                  id="setup"
                  placeholder="0,00"
                  value={setupValue}
                  onChange={(e) => setSetupValue(e.target.value)}
                />
              </div>
            </div>

            {/* Campos calculados */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Mensalidade</span>
                <span className="text-lg font-semibold">
                  R$ {recurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">Prêmio Implantação</span>
                  <span className="text-xs text-muted-foreground ml-2">(10% fixo)</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  R$ {setupPrize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                O prêmio sobre a mensalidade será calculado com base no atingimento da meta do vendedor (faixa de comissão).
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!companyName.trim() || !sellerId || createDirectSale.isPending}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Venda
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
