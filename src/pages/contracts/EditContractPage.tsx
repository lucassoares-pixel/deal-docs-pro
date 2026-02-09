import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/hooks/useProducts';
import { useContracts } from '@/hooks/useContracts';
import { useAuth } from '@/context/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { 
  ArrowLeft, 
  Plus,
  Minus,
  Percent,
  DollarSign,
  Calendar,
  Loader2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

type Product = Tables<'products'>;
type DiscountPeriodType = 'indeterminate' | 'months' | 'fixed_date';

interface SelectedProduct {
  product: Product;
  quantity: number;
  customBasePrice: number | null;
  discountPercentage: number;
  discountPeriodType: DiscountPeriodType;
  discountMonths: number | null;
  discountEndDate: string | null;
  customImplementationPrice: number | null;
}

export default function EditContractPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProducts, loading: loadingProducts } = useProducts();
  const { contracts, loading: loadingContracts, updateContract, getContractById } = useContracts();
  const { profile } = useAuth();

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [startDate, setStartDate] = useState('');
  const [billingDay, setBillingDay] = useState('5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [extraDiscountValue, setExtraDiscountValue] = useState<string>('');
  const [extraDiscountPeriodType, setExtraDiscountPeriodType] = useState<DiscountPeriodType>('indeterminate');
  const [extraDiscountMonths, setExtraDiscountMonths] = useState<string>('');
  const [extraDiscountEndDate, setExtraDiscountEndDate] = useState<string>('');

  const contract = id ? getContractById(id) : undefined;

  // Initialize form from existing contract
  useEffect(() => {
    if (contract && !initialized && activeProducts.length > 0) {
      setStartDate(contract.start_date);
      setBillingDay(String(contract.billing_day));
      setExtraDiscountValue(String(contract.extra_discount_value || ''));
      setExtraDiscountPeriodType((contract.extra_discount_period_type as DiscountPeriodType) || 'indeterminate');
      setExtraDiscountMonths(String(contract.extra_discount_months || ''));
      setExtraDiscountEndDate(contract.extra_discount_end_date || '');

      const products: SelectedProduct[] = (contract.products || []).map(cp => {
        const prod = activeProducts.find(p => p.id === cp.product_id) || cp.product;
        return {
          product: prod as Product,
          quantity: cp.quantity || 1,
          customBasePrice: Number(cp.full_price) / (cp.quantity || 1) !== Number(prod?.base_price) 
            ? Number(cp.full_price) / (cp.quantity || 1) 
            : null,
          discountPercentage: Number(cp.discount_percentage) || 0,
          discountPeriodType: (cp.discount_period_type as DiscountPeriodType) || 'indeterminate',
          discountMonths: cp.discount_months || null,
          discountEndDate: cp.discount_end_date || null,
          customImplementationPrice: cp.custom_enrollment_price != null ? Number(cp.custom_enrollment_price) : null,
        };
      });
      setSelectedProducts(products);
      setInitialized(true);
    }
  }, [contract, initialized, activeProducts]);

  const recurringProducts = activeProducts.filter(p => p.billing_type === 'recurring');
  const oneTimeProducts = activeProducts.filter(p => p.billing_type === 'one_time');

  const calculations = useMemo(() => {
    let recurringFull = 0;
    let recurringDiscounted = 0;
    let implementationTotal = 0;

    selectedProducts.forEach(({ product, quantity, discountPercentage, customImplementationPrice, customBasePrice }) => {
      const effectiveBasePrice = customBasePrice ?? Number(product.base_price);
      if (product.billing_type === 'recurring') {
        const full = effectiveBasePrice * quantity;
        const discounted = full * (1 - discountPercentage / 100);
        recurringFull += full;
        recurringDiscounted += discounted;
        const implPrice = customImplementationPrice ?? (product.setup_price ? Number(product.setup_price) : 0);
        implementationTotal += implPrice * quantity;
      } else {
        const full = effectiveBasePrice * quantity;
        const discounted = full * (1 - discountPercentage / 100);
        implementationTotal += discounted;
      }
    });

    const maxFidelity = Math.max(...selectedProducts.map(p => p.product.fidelity_months), 0);
    const extraDiscount = parseFloat(extraDiscountValue) || 0;
    const recurringWithExtraDiscount = Math.max(0, recurringDiscounted - extraDiscount);

    return { recurringFull, recurringDiscounted, recurringWithExtraDiscount, implementationTotal, maxFidelity, savings: recurringFull - recurringDiscounted, extraDiscount };
  }, [selectedProducts, extraDiscountValue]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleAddProduct = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      setSelectedProducts(prev => prev.map(p => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedProducts(prev => [...prev, {
        product, quantity: 1, customBasePrice: null, discountPercentage: 0,
        discountPeriodType: 'indeterminate', discountMonths: null, discountEndDate: null,
        customImplementationPrice: product.setup_price ? Number(product.setup_price) : null,
      }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(prev => prev.map(p => p.product.id === productId ? { ...p, quantity } : p));
  };

  const handleDiscountChange = (productId: string, discount: number) => {
    const product = selectedProducts.find(p => p.product.id === productId);
    if (!product) return;
    if (!product.product.allow_discount) { toast.error('Este produto não permite desconto'); return; }
    if (discount > product.product.max_discount_percentage) { toast.error(`Desconto máximo: ${product.product.max_discount_percentage}%`); return; }
    setSelectedProducts(prev => prev.map(p => p.product.id === productId ? { ...p, discountPercentage: Math.max(0, discount) } : p));
  };

  const handleDiscountPeriodChange = (productId: string, periodType: DiscountPeriodType) => {
    setSelectedProducts(prev => prev.map(p => p.product.id === productId ? {
      ...p, discountPeriodType: periodType,
      discountMonths: periodType === 'months' ? p.discountMonths : null,
      discountEndDate: periodType === 'fixed_date' ? p.discountEndDate : null,
    } : p));
  };

  const handleDiscountMonthsChange = (productId: string, months: number | null) => {
    setSelectedProducts(prev => prev.map(p => p.product.id === productId ? { ...p, discountMonths: months } : p));
  };

  const handleDiscountEndDateChange = (productId: string, date: string | null) => {
    setSelectedProducts(prev => prev.map(p => p.product.id === productId ? { ...p, discountEndDate: date } : p));
  };

  const handleImplementationPriceChange = (productId: string, price: number | null) => {
    setSelectedProducts(prev => prev.map(p => p.product.id === productId ? { ...p, customImplementationPrice: price } : p));
  };

  const handleBasePriceChange = (productId: string, price: number | null) => {
    const sp = selectedProducts.find(p => p.product.id === productId);
    if (!sp) return;
    const originalPrice = Number(sp.product.base_price);
    if (price !== null && price < originalPrice) {
      toast.error(`O preço não pode ser inferior ao preço base (${formatCurrency(originalPrice)})`);
      return;
    }
    setSelectedProducts(prev => prev.map(p => p.product.id === productId ? { ...p, customBasePrice: price } : p));
  };

  const handleSave = async () => {
    if (!id || !contract) return;
    if (selectedProducts.length === 0) { toast.error('Selecione pelo menos um produto'); return; }

    setIsSubmitting(true);
    try {
      const contractProducts = selectedProducts.map(({ product, quantity, discountPercentage, discountPeriodType, discountMonths, discountEndDate, customImplementationPrice, customBasePrice }) => {
        const effectiveBasePrice = customBasePrice ?? Number(product.base_price);
        return {
          product_id: product.id, quantity,
          discount_percentage: discountPercentage,
          full_price: effectiveBasePrice * quantity,
          discounted_price: effectiveBasePrice * quantity * (1 - discountPercentage / 100),
          discount_period_type: discountPeriodType,
          discount_months: discountPeriodType === 'months' ? discountMonths : null,
          discount_end_date: discountPeriodType === 'fixed_date' ? discountEndDate : null,
          custom_enrollment_price: customImplementationPrice,
        };
      });

      const discountLogs = selectedProducts
        .filter(p => p.discountPercentage > 0)
        .map(({ product, quantity, discountPercentage, customBasePrice }) => {
          const effectiveBasePrice = customBasePrice ?? Number(product.base_price);
          return {
            product_id: product.id, product_name: product.name,
            original_price: effectiveBasePrice * quantity,
            discount_percentage: discountPercentage,
            discounted_price: effectiveBasePrice * quantity * (1 - discountPercentage / 100),
            applied_by: profile?.name || 'Unknown',
          };
        });

      const result = await updateContract(
        id,
        {
          recurring_total_full: calculations.recurringFull,
          recurring_total_discounted: calculations.recurringWithExtraDiscount,
          setup_total: calculations.implementationTotal,
          start_date: startDate,
          billing_day: parseInt(billingDay),
          fidelity_months: calculations.maxFidelity,
          extra_discount_value: calculations.extraDiscount,
          extra_discount_period_type: extraDiscountPeriodType,
          extra_discount_months: extraDiscountPeriodType === 'months' ? parseInt(extraDiscountMonths) || null : null,
          extra_discount_end_date: extraDiscountPeriodType === 'fixed_date' ? extraDiscountEndDate || null : null,
        },
        contractProducts,
        discountLogs
      );

      if (result) {
        toast.success('Contrato atualizado com sucesso!');
        navigate('/contracts');
      }
    } catch (error) {
      toast.error('Erro ao atualizar contrato');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingContracts || loadingProducts) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Contrato não encontrado</p>
          <Button variant="outline" onClick={() => navigate('/contracts')}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Editar Contrato"
        subtitle={`Cliente: ${contract.client?.trade_name || 'N/A'}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button className="btn-secondary" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Contract Config */}
        <div className="card-elevated p-6">
          <h2 className="section-title">Configuração</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="form-label">Data de Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="form-label">Dia de Vencimento</Label>
              <Select value={billingDay} onValueChange={setBillingDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25].map(day => (
                    <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="form-label">Status</Label>
              <Input value={contract.status} disabled className="bg-muted" />
            </div>
          </div>
        </div>

        {/* Add Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-elevated p-6">
            <h2 className="section-title flex items-center gap-2">
              <div className="badge-info">Recorrente</div>
              Produtos Mensais
            </h2>
            <div className="space-y-3">
              {recurringProducts.map(product => {
                const selected = selectedProducts.find(p => p.product.id === product.id);
                return (
                  <div key={product.id} className={`p-4 rounded-lg border transition-all cursor-pointer ${selected ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
                    onClick={() => !selected && handleAddProduct(product)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                        <span className="text-sm font-medium text-accent">{formatCurrency(Number(product.base_price))}/mês</span>
                      </div>
                      {selected ? (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRemoveProduct(product.id); }}>
                          <Minus className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline"><Plus className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-elevated p-6">
            <h2 className="section-title flex items-center gap-2">
              <div className="badge-warning">Único</div>
              Serviços Avulsos
            </h2>
            <div className="space-y-3">
              {oneTimeProducts.map(product => {
                const selected = selectedProducts.find(p => p.product.id === product.id);
                return (
                  <div key={product.id} className={`p-4 rounded-lg border transition-all cursor-pointer ${selected ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
                    onClick={() => !selected && handleAddProduct(product)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                        <span className="text-sm font-medium text-warning">{formatCurrency(Number(product.base_price))}</span>
                      </div>
                      {selected ? (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRemoveProduct(product.id); }}>
                          <Minus className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline"><Plus className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Products */}
        {selectedProducts.length > 0 && (
          <div className="card-elevated p-6">
            <h2 className="section-title">Produtos Selecionados</h2>
            <div className="space-y-6">
              {selectedProducts.map(({ product, quantity, discountPercentage, discountPeriodType, discountMonths, discountEndDate, customImplementationPrice, customBasePrice }) => {
                const effectiveBasePrice = customBasePrice ?? Number(product.base_price);
                const fullPrice = effectiveBasePrice * quantity;
                const discountedPrice = fullPrice * (1 - discountPercentage / 100);
                const hasImplementation = product.billing_type === 'recurring' && product.setup_price;

                return (
                  <div key={product.id} className="p-4 bg-muted/30 rounded-lg space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{product.name}</p>
                        <span className={product.billing_type === 'recurring' ? 'badge-info' : 'badge-warning'}>
                          {product.billing_type === 'recurring' ? 'Mensal' : 'Único'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Qtd:</Label>
                          <div className="flex items-center">
                            <Button size="sm" variant="outline" onClick={() => handleQuantityChange(product.id, quantity - 1)} disabled={quantity <= 1}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-10 text-center font-medium">{quantity}</span>
                            <Button size="sm" variant="outline" onClick={() => handleQuantityChange(product.id, quantity + 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right min-w-[120px]">
                          {discountPercentage > 0 ? (
                            <>
                              <p className="text-sm text-muted-foreground line-through">{formatCurrency(fullPrice)}</p>
                              <p className="font-medium text-success">{formatCurrency(discountedPrice)}</p>
                            </>
                          ) : (
                            <p className="font-medium text-foreground">{formatCurrency(fullPrice)}</p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveProduct(product.id)} className="text-destructive hover:text-destructive">
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Custom base price */}
                    <div className="pt-4 border-t border-border/50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Preço Unitário (R$)</Label>
                          <div className="relative mt-1">
                            <Input type="number" min={Number(product.base_price)} step="0.01"
                              value={customBasePrice ?? Number(product.base_price)}
                              onChange={(e) => { const val = parseFloat(e.target.value); handleBasePriceChange(product.id, isNaN(val) ? null : val); }}
                              className="pr-6 text-right" />
                            <DollarSign className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Mín: {formatCurrency(Number(product.base_price))}</p>
                        </div>
                      </div>
                    </div>

                    {/* Discount */}
                    {product.allow_discount && (
                      <div className="pt-4 border-t border-border/50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Desconto (%)</Label>
                            <div className="relative mt-1">
                              <Input type="number" min="0" max={product.max_discount_percentage}
                                value={discountPercentage}
                                onChange={(e) => handleDiscountChange(product.id, parseFloat(e.target.value) || 0)}
                                className="pr-6 text-right" />
                              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Máx: {product.max_discount_percentage}%</p>
                          </div>
                          {discountPercentage > 0 && (
                            <>
                              <div>
                                <Label className="text-sm text-muted-foreground">Período do Desconto</Label>
                                <Select value={discountPeriodType} onValueChange={(v: DiscountPeriodType) => handleDiscountPeriodChange(product.id, v)}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="indeterminate">Indeterminado</SelectItem>
                                    <SelectItem value="months">Por meses</SelectItem>
                                    <SelectItem value="fixed_date">Até data específica</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {discountPeriodType === 'months' && (
                                <div>
                                  <Label className="text-sm text-muted-foreground">Quantidade de Meses</Label>
                                  <Input type="number" min="1" value={discountMonths || ''} onChange={(e) => handleDiscountMonthsChange(product.id, parseInt(e.target.value) || null)} placeholder="Ex: 3" className="mt-1" />
                                </div>
                              )}
                              {discountPeriodType === 'fixed_date' && (
                                <div>
                                  <Label className="text-sm text-muted-foreground">Data Final</Label>
                                  <Input type="date" value={discountEndDate || ''} onChange={(e) => handleDiscountEndDateChange(product.id, e.target.value || null)} className="mt-1" />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Implementation price */}
                    {hasImplementation && (
                      <div className="pt-4 border-t border-border/50">
                        <div className="flex items-center gap-4">
                          <div className="w-48">
                            <Label className="text-sm text-muted-foreground">Valor de Implantação (R$)</Label>
                            <Input type="number" min="0" step="0.01" value={customImplementationPrice ?? ''}
                              onChange={(e) => handleImplementationPriceChange(product.id, parseFloat(e.target.value) || null)}
                              placeholder={product.setup_price?.toString() || '0'} className="mt-1" />
                          </div>
                          <p className="text-xs text-muted-foreground">Original: {formatCurrency(Number(product.setup_price) || 0)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Subtotal Mensal</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(calculations.recurringDiscounted)}</p>
                  {calculations.savings > 0 && <p className="text-sm text-success">Economia: {formatCurrency(calculations.savings)}/mês</p>}
                </div>
                <div className="p-4 bg-warning/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Implantação / Únicos</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(calculations.implementationTotal)}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Fidelidade</p>
                  <p className="text-2xl font-bold text-foreground">{calculations.maxFidelity} meses</p>
                </div>
              </div>
            </div>

            {/* Extra Discount */}
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-medium text-foreground mb-4">Desconto Extra sobre o Subtotal</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Valor do Desconto (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={extraDiscountValue} onChange={(e) => setExtraDiscountValue(e.target.value)} placeholder="0,00" className="mt-1" />
                </div>
                {parseFloat(extraDiscountValue) > 0 && (
                  <>
                    <div>
                      <Label className="text-sm text-muted-foreground">Período do Desconto</Label>
                      <Select value={extraDiscountPeriodType} onValueChange={(v: DiscountPeriodType) => { setExtraDiscountPeriodType(v); if (v !== 'months') setExtraDiscountMonths(''); if (v !== 'fixed_date') setExtraDiscountEndDate(''); }}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="indeterminate">Indeterminado</SelectItem>
                          <SelectItem value="months">Por meses</SelectItem>
                          <SelectItem value="fixed_date">Até data específica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {extraDiscountPeriodType === 'months' && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Quantidade de Meses</Label>
                        <Input type="number" min="1" value={extraDiscountMonths} onChange={(e) => setExtraDiscountMonths(e.target.value)} placeholder="Ex: 3" className="mt-1" />
                      </div>
                    )}
                    {extraDiscountPeriodType === 'fixed_date' && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Data Final</Label>
                        <Input type="date" value={extraDiscountEndDate} onChange={(e) => setExtraDiscountEndDate(e.target.value)} className="mt-1" />
                      </div>
                    )}
                  </>
                )}
              </div>
              {calculations.extraDiscount > 0 && (
                <div className="mt-4 p-4 bg-success/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Valor Final Mensal com Desconto Extra</p>
                    <p className="text-2xl font-bold text-success">{formatCurrency(calculations.recurringWithExtraDiscount)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save button at bottom */}
        <div className="flex justify-end">
          <Button className="btn-secondary" onClick={handleSave} disabled={isSubmitting || selectedProducts.length === 0}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
