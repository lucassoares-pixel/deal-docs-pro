import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DirectSale } from '@/hooks/useDirectSales';

interface EditDirectSaleDialogProps {
  sale: DirectSale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    id: string;
    company_name: string;
    sale_date: string;
    recurring_value: number;
    setup_value: number;
    seller_id: string;
  }) => void;
  sellers: { id: string; name: string }[];
  isPending?: boolean;
}

export function EditDirectSaleDialog({ sale, open, onOpenChange, onSave, sellers, isPending }: EditDirectSaleDialogProps) {
  const [companyName, setCompanyName] = useState('');
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [recurringValue, setRecurringValue] = useState('');
  const [setupValue, setSetupValue] = useState('');
  const [sellerId, setSellerId] = useState('');

  // Sync state when sale changes
  useMemo(() => {
    if (sale) {
      setCompanyName(sale.company_name);
      setSaleDate(parseISO(sale.sale_date));
      setRecurringValue(sale.recurring_value?.toString().replace('.', ',') || '');
      setSetupValue(sale.setup_value?.toString().replace('.', ',') || '');
      setSellerId(sale.seller_id || '');
    }
  }, [sale]);

  const parseCurrency = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const recurring = parseCurrency(recurringValue);
  const setup = parseCurrency(setupValue);
  const setupPrize = setup * 0.10;

  const handleSubmit = () => {
    if (!sale || !companyName.trim() || !sellerId) return;
    onSave({
      id: sale.id,
      company_name: companyName.trim(),
      sale_date: format(saleDate, 'yyyy-MM-dd'),
      recurring_value: recurring,
      setup_value: setup,
      seller_id: sellerId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Venda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
            <Label>Razão Social</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da empresa..."
            />
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label>Data da Venda</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(saleDate, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={saleDate}
                  onSelect={(d) => d && setSaleDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mensalidade (R$)</Label>
              <Input
                placeholder="0,00"
                value={recurringValue}
                onChange={(e) => setRecurringValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Implantação (R$)</Label>
              <Input
                placeholder="0,00"
                value={setupValue}
                onChange={(e) => setSetupValue(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Mensalidade</span>
              <span className="font-semibold">R$ {recurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Prêmio Implantação (10%)</span>
              <span className="font-bold text-primary">R$ {setupPrize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!companyName.trim() || !sellerId || isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
