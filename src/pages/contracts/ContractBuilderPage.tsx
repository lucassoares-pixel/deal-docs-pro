import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { useContracts } from '@/hooks/useContracts';
import { useAuth } from '@/context/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Package, 
  Users, 
  FileText, 
  Plus,
  Minus,
  Percent,
  DollarSign,
  Calendar,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

type Step = 'client' | 'products' | 'review';
type Product = Tables<'products'>;
type Client = Tables<'clients'>;
type LegalRep = Tables<'legal_representatives'>;

type DiscountPeriodType = 'indeterminate' | 'months' | 'fixed_date';

type DiscountMode = 'percentage' | 'fixed';

interface SelectedProduct {
  product: Product;
  quantity: number;
  customBasePrice: number | null;
  discountPercentage: number;
  discountMode: DiscountMode;
  discountFixedValue: number;
  discountPeriodType: DiscountPeriodType;
  discountMonths: number | null;
  discountEndDate: string | null;
  customImplementationPrice: number | null;
}

export default function ContractBuilderPage() {
  const navigate = useNavigate();
  const { clients, legalRepresentatives, loading: loadingClients } = useClients();
  const { activeProducts, loading: loadingProducts } = useProducts();
  const { addContract } = useContracts();
  const { profile } = useAuth();

  const [step, setStep] = useState<Step>('client');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [billingDay, setBillingDay] = useState('5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainingContactName, setTrainingContactName] = useState('');
  const [trainingContactPhone, setTrainingContactPhone] = useState('');
  const [implementationType, setImplementationType] = useState('remota');
  const [certificateType, setCertificateType] = useState('');

  // Extra discount on subtotal
  const [extraDiscountValue, setExtraDiscountValue] = useState<string>('');
  const [extraDiscountPeriodType, setExtraDiscountPeriodType] = useState<DiscountPeriodType>('indeterminate');
  const [extraDiscountMonths, setExtraDiscountMonths] = useState<string>('');
  const [extraDiscountEndDate, setExtraDiscountEndDate] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const legalRep = legalRepresentatives.find(lr => lr.client_id === selectedClientId);

  // Get unique brands from active products
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    activeProducts.forEach(p => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [activeProducts]);

  // Filter products by selected brand, then by search
  const filteredProducts = activeProducts.filter(p => {
    if (!selectedBrand) return false;
    if (p.brand !== selectedBrand) return false;
    if (!productSearch.trim()) return true;
    const search = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search) ||
      p.sku?.toLowerCase().includes(search)
    );
  });
  const recurringProducts = filteredProducts.filter(p => p.billing_type === 'recurring');
  const oneTimeProducts = filteredProducts.filter(p => p.billing_type === 'one_time');

  // Calculate totals
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

    const maxFidelity = Math.max(
      ...selectedProducts.map(p => p.product.fidelity_months),
      0
    );

    // Apply extra discount
    const extraDiscount = parseFloat(extraDiscountValue) || 0;
    const recurringWithExtraDiscount = Math.max(0, recurringDiscounted - extraDiscount);

    return {
      recurringFull,
      recurringDiscounted,
      recurringWithExtraDiscount,
      implementationTotal,
      maxFidelity,
      savings: recurringFull - recurringDiscounted,
      extraDiscount,
    };
  }, [selectedProducts, extraDiscountValue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAddProduct = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      setSelectedProducts(prev => 
        prev.map(p => 
          p.product.id === product.id 
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [...prev, { 
        product, 
        quantity: 1, 
        customBasePrice: null,
        discountPercentage: 0,
        discountMode: 'percentage',
        discountFixedValue: 0,
        discountPeriodType: 'indeterminate',
        discountMonths: null,
        discountEndDate: null,
        customImplementationPrice: product.setup_price ? Number(product.setup_price) : null,
      }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, quantity } : p
      )
    );
  };

  const handleDiscountChange = (productId: string, discount: number) => {
    const sp = selectedProducts.find(p => p.product.id === productId);
    if (!sp) return;

    if (!sp.product.allow_discount) {
      toast.error('Este produto não permite desconto');
      return;
    }

    if (discount > sp.product.max_discount_percentage) {
      toast.error(`Desconto máximo permitido: ${sp.product.max_discount_percentage}%`);
      return;
    }

    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, discountPercentage: Math.max(0, discount), discountMode: 'percentage' } : p
      )
    );
  };

  const handleDiscountFixedChange = (productId: string, fixedValue: number) => {
    const sp = selectedProducts.find(p => p.product.id === productId);
    if (!sp) return;

    if (!sp.product.allow_discount) {
      toast.error('Este produto não permite desconto');
      return;
    }

    const effectivePrice = sp.customBasePrice ?? Number(sp.product.base_price);
    const maxDiscountPercent = sp.product.max_discount_percentage;
    const maxFixedValue = effectivePrice * (maxDiscountPercent / 100);

    if (fixedValue > maxFixedValue) {
      toast.error(`Desconto máximo permitido: ${formatCurrency(maxFixedValue)} (${maxDiscountPercent}%)`);
      return;
    }

    const percentage = effectivePrice > 0 ? (fixedValue / effectivePrice) * 100 : 0;

    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, discountFixedValue: Math.max(0, fixedValue), discountPercentage: Math.round(percentage * 100) / 100, discountMode: 'fixed' } : p
      )
    );
  };

  const handleDiscountModeChange = (productId: string, mode: DiscountMode) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, discountMode: mode, discountPercentage: 0, discountFixedValue: 0 } : p
      )
    );
  };

  const handleDiscountPeriodChange = (productId: string, periodType: DiscountPeriodType) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { 
          ...p, 
          discountPeriodType: periodType,
          discountMonths: periodType === 'months' ? p.discountMonths : null,
          discountEndDate: periodType === 'fixed_date' ? p.discountEndDate : null,
        } : p
      )
    );
  };

  const handleDiscountMonthsChange = (productId: string, months: number | null) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, discountMonths: months } : p
      )
    );
  };

  const handleDiscountEndDateChange = (productId: string, date: string | null) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, discountEndDate: date } : p
      )
    );
  };

  const handleImplementationPriceChange = (productId: string, price: number | null) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, customImplementationPrice: price } : p
      )
    );
  };

  const handleBasePriceChange = (productId: string, price: number | null) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, customBasePrice: price } : p
      )
    );
  };

  const handleBasePriceBlur = (productId: string) => {
    const sp = selectedProducts.find(p => p.product.id === productId);
    if (!sp) return;
    const originalPrice = Number(sp.product.base_price);
    if (sp.customBasePrice !== null && sp.customBasePrice < originalPrice) {
      toast.error(`O preço não pode ser inferior ao preço base (${formatCurrency(originalPrice)})`);
      setSelectedProducts(prev =>
        prev.map(p =>
          p.product.id === productId ? { ...p, customBasePrice: null } : p
        )
      );
    }
  };

  const validateStep = () => {
    if (step === 'client') {
      if (!selectedClientId) {
        toast.error('Selecione um cliente');
        return false;
      }
    } else if (step === 'products') {
      if (selectedProducts.length === 0) {
        toast.error('Selecione pelo menos um produto');
        return false;
      }
      // Validate discount periods
      for (const sp of selectedProducts) {
        if (sp.discountPercentage > 0) {
          if (sp.discountPeriodType === 'months' && (!sp.discountMonths || sp.discountMonths <= 0)) {
            toast.error(`Defina o período do desconto para ${sp.product.name}`);
            return false;
          }
          if (sp.discountPeriodType === 'fixed_date' && !sp.discountEndDate) {
            toast.error(`Defina a data final do desconto para ${sp.product.name}`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep()) return;
    
    if (step === 'client') setStep('products');
    else if (step === 'products') setStep('review');
  };

  const handlePrevStep = () => {
    if (step === 'products') setStep('client');
    else if (step === 'review') setStep('products');
  };

  const handleCreateContract = async () => {
    if (!selectedClient || !legalRep) {
      toast.error('Dados do cliente incompletos');
      return;
    }

    setIsSubmitting(true);

    try {
      const contractProducts = selectedProducts.map(({ product, quantity, discountPercentage, discountPeriodType, discountMonths, discountEndDate, customImplementationPrice, customBasePrice }) => {
        const effectiveBasePrice = customBasePrice ?? Number(product.base_price);
        return {
          product_id: product.id,
          quantity,
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
            product_id: product.id,
            product_name: product.name,
            original_price: effectiveBasePrice * quantity,
            discount_percentage: discountPercentage,
            discounted_price: effectiveBasePrice * quantity * (1 - discountPercentage / 100),
            applied_by: profile?.name || 'Unknown',
          };
        });

      const result = await addContract(
        {
          client_id: selectedClient.id,
          legal_representative_id: legalRep.id,
          recurring_total_full: calculations.recurringFull,
          recurring_total_discounted: calculations.recurringWithExtraDiscount,
          setup_total: calculations.implementationTotal,
          start_date: startDate,
          billing_day: parseInt(billingDay),
          fidelity_months: calculations.maxFidelity,
          status: 'active',
          extra_discount_value: calculations.extraDiscount,
          extra_discount_period_type: extraDiscountPeriodType,
          extra_discount_months: extraDiscountPeriodType === 'months' ? parseInt(extraDiscountMonths) || null : null,
          extra_discount_end_date: extraDiscountPeriodType === 'fixed_date' ? extraDiscountEndDate || null : null,
          training_contact_name: trainingContactName || null,
          training_contact_phone: trainingContactPhone || null,
          implementation_type: implementationType || 'remota',
          certificate_type: certificateType || null,
        } as any,
        contractProducts,
        discountLogs
      );

      if (result) {
        // Evita download automático (frequentemente bloqueado em iframe).
        // O usuário baixa manualmente pelos botões na listagem de contratos.
        toast.success('Contrato criado! Baixe os PDFs na lista de contratos.');
        navigate('/contracts');
      }
    } catch (error) {
      toast.error('Erro ao criar contrato');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 'client', label: 'Cliente', icon: Users },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'review', label: 'Revisão', icon: FileText },
  ];

  if (loadingClients || loadingProducts) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Novo Contrato"
        subtitle="Crie um novo contrato para seu cliente"
        actions={
          <Button variant="outline" onClick={() => navigate('/contracts')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        }
      />

      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((s, index) => {
            const isActive = step === s.id;
            const isPast = steps.findIndex(st => st.id === step) > index;
            
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isActive ? 'bg-secondary text-secondary-foreground' : ''}
                    ${isPast ? 'bg-success text-success-foreground' : ''}
                    ${!isActive && !isPast ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {isPast ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className={`mt-2 text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-0.5 mx-4 ${isPast ? 'bg-success' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {step === 'client' && (
          <div className="card-elevated p-6">
            <h2 className="section-title">Selecione o Cliente</h2>
            
            <div className="max-w-md">
              <Label className="form-label">Cliente *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.trade_name} - {client.cnpj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClient && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Dados do Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Razão Social</p>
                    <p className="font-medium">{selectedClient.company_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CNPJ</p>
                    <p className="font-medium font-mono">{selectedClient.cnpj}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">E-mail</p>
                    <p className="font-medium">{selectedClient.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedClient.phone}</p>
                  </div>
                </div>

                {legalRep && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="font-medium text-foreground mb-2">Representante Legal</h4>
                    <p className="text-sm">
                      {legalRep.legal_name} - {legalRep.role}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <Button variant="outline" onClick={() => navigate('/clients/new')}>
                <Plus className="w-4 h-4" />
                Cadastrar Novo Cliente
              </Button>
            </div>
          </div>
        )}

        {step === 'products' && (
          <>
            {/* Brand Selector + Search */}
            <div className="card-elevated p-4 space-y-4">
              <div>
                <Label className="form-label">Fornecedor *</Label>
                <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v); setProductSearch(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor para ver os módulos..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBrands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedBrand && (
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar módulos por nome ou SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
            </div>

            {!selectedBrand && (
              <div className="card-elevated p-8 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Selecione um fornecedor acima para ver os módulos disponíveis.</p>
              </div>
            )}

            {selectedBrand && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recurring Products */}
              <div className="card-elevated p-6">
                <h2 className="section-title flex items-center gap-2">
                  <div className="badge-info">Recorrente</div>
                  Produtos Mensais
                </h2>
                <div className="space-y-3">
                  {recurringProducts.map(product => {
                    const selected = selectedProducts.find(p => p.product.id === product.id);
                    return (
                      <div 
                        key={product.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer
                          ${selected ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}
                        `}
                        onClick={() => !selected && handleAddProduct(product)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-medium text-accent">
                                {formatCurrency(Number(product.base_price))}/mês
                              </span>
                              {product.allow_discount && (
                                <span className="text-xs text-muted-foreground">
                                  Até {product.max_discount_percentage}% desc.
                                </span>
                              )}
                            </div>
                          </div>
                          {selected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveProduct(product.id);
                              }}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline">
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* One-Time Products */}
              <div className="card-elevated p-6">
                <h2 className="section-title flex items-center gap-2">
                  <div className="badge-warning">Único</div>
                  Serviços Avulsos
                </h2>
                <div className="space-y-3">
                  {oneTimeProducts.map(product => {
                    const selected = selectedProducts.find(p => p.product.id === product.id);
                    return (
                      <div 
                        key={product.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer
                          ${selected ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}
                        `}
                        onClick={() => !selected && handleAddProduct(product)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-medium text-warning">
                                {formatCurrency(Number(product.base_price))}
                              </span>
                              {product.allow_discount && (
                                <span className="text-xs text-muted-foreground">
                                  Até {product.max_discount_percentage}% desc.
                                </span>
                              )}
                            </div>
                          </div>
                          {selected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveProduct(product.id);
                              }}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline">
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

            {/* Selected Products with Discount Configuration */}
            {selectedProducts.length > 0 && (
              <div className="card-elevated p-6">
                <h2 className="section-title">Produtos Selecionados</h2>
                <div className="space-y-6">
                  {selectedProducts.map(({ product, quantity, discountPercentage, discountMode, discountFixedValue, discountPeriodType, discountMonths, discountEndDate, customImplementationPrice, customBasePrice }) => {
                    const effectiveBasePrice = customBasePrice ?? Number(product.base_price);
                    const fullPrice = effectiveBasePrice * quantity;
                    const discountedPrice = fullPrice * (1 - discountPercentage / 100);
                    const hasImplementation = product.billing_type === 'recurring' && product.setup_price;
                    
                    return (
                      <div key={product.id} className="p-4 bg-muted/30 rounded-lg space-y-4">
                        {/* Row 1: Product info, quantity, remove */}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{product.name}</p>
                            <span className={product.billing_type === 'recurring' ? 'badge-info' : 'badge-warning'}>
                              {product.billing_type === 'recurring' ? 'Mensal' : 'Único'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Quantity */}
                            <div className="flex items-center gap-2">
                              <Label className="text-sm text-muted-foreground">Qtd:</Label>
                              <div className="flex items-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuantityChange(product.id, quantity - 1)}
                                  disabled={quantity <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-10 text-center font-medium">{quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuantityChange(product.id, quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Prices */}
                            <div className="text-right min-w-[120px]">
                              {discountPercentage > 0 ? (
                                <>
                                  <p className="text-sm text-muted-foreground line-through">
                                    {formatCurrency(fullPrice)}
                                  </p>
                                  <p className="font-medium text-success">
                                    {formatCurrency(discountedPrice)}
                                  </p>
                                </>
                              ) : (
                                <p className="font-medium text-foreground">
                                  {formatCurrency(fullPrice)}
                                </p>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveProduct(product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Row 2: Custom base price */}
                        <div className="pt-4 border-t border-border/50">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-sm text-muted-foreground">Preço Unitário (R$)</Label>
                              <div className="relative mt-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={customBasePrice ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                    handleBasePriceChange(product.id, val === null || isNaN(val) ? null : val);
                                  }}
                                  onBlur={() => handleBasePriceBlur(product.id)}
                                  placeholder={Number(product.base_price).toFixed(2)}
                                  className="pr-6 text-right"
                                />
                                <DollarSign className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Mín: {formatCurrency(Number(product.base_price))}</p>
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Discount configuration */}
                        {product.allow_discount && (
                          <div className="pt-4 border-t border-border/50">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {/* Discount Mode Toggle + Value */}
                              <div>
                                <Label className="text-sm text-muted-foreground">Desconto</Label>
                                <div className="flex items-center gap-1 mt-1 mb-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={discountMode === 'percentage' ? 'default' : 'outline'}
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleDiscountModeChange(product.id, 'percentage')}
                                  >
                                    <Percent className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={discountMode === 'fixed' ? 'default' : 'outline'}
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleDiscountModeChange(product.id, 'fixed')}
                                  >
                                    R$
                                  </Button>
                                </div>
                                {discountMode === 'percentage' ? (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min="0"
                                      max={product.max_discount_percentage}
                                      value={discountPercentage || ''}
                                      onChange={(e) => handleDiscountChange(product.id, parseFloat(e.target.value) || 0)}
                                      placeholder="0"
                                      className="pr-6 text-right"
                                    />
                                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={discountFixedValue || ''}
                                      onChange={(e) => handleDiscountFixedChange(product.id, parseFloat(e.target.value) || 0)}
                                      placeholder="0,00"
                                      className="pr-6 text-right"
                                    />
                                    <DollarSign className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  Máx: {product.max_discount_percentage}% ({formatCurrency((customBasePrice ?? Number(product.base_price)) * product.max_discount_percentage / 100)})
                                </p>
                              </div>

                              {/* Discount Period Type */}
                              {discountPercentage > 0 && (
                                <>
                                  <div>
                                    <Label className="text-sm text-muted-foreground">Período do Desconto</Label>
                                    <Select
                                      value={discountPeriodType}
                                      onValueChange={(value: DiscountPeriodType) => handleDiscountPeriodChange(product.id, value)}
                                    >
                                      <SelectTrigger className="mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="indeterminate">Indeterminado</SelectItem>
                                        <SelectItem value="months">Por meses</SelectItem>
                                        <SelectItem value="fixed_date">Até data específica</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Discount Months */}
                                  {discountPeriodType === 'months' && (
                                    <div>
                                      <Label className="text-sm text-muted-foreground">Quantidade de Meses</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={discountMonths || ''}
                                        onChange={(e) => handleDiscountMonthsChange(product.id, parseInt(e.target.value) || null)}
                                        placeholder="Ex: 3"
                                        className="mt-1"
                                      />
                                    </div>
                                  )}

                                  {/* Discount End Date */}
                                  {discountPeriodType === 'fixed_date' && (
                                    <div>
                                      <Label className="text-sm text-muted-foreground">Data Final</Label>
                                      <Input
                                        type="date"
                                        value={discountEndDate || ''}
                                        onChange={(e) => handleDiscountEndDateChange(product.id, e.target.value || null)}
                                        className="mt-1"
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Row 3: Implementation price (for recurring products) */}
                        {hasImplementation && (
                          <div className="pt-4 border-t border-border/50">
                            <div className="flex items-center gap-4">
                              <div className="w-48">
                                <Label className="text-sm text-muted-foreground">Valor de Implantação (R$)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={customImplementationPrice ?? ''}
                                  onChange={(e) => handleImplementationPriceChange(product.id, parseFloat(e.target.value) || null)}
                                  placeholder={product.setup_price?.toString() || '0'}
                                  className="mt-1"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Valor original: {formatCurrency(Number(product.setup_price) || 0)}
                              </p>
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
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(calculations.recurringDiscounted)}
                      </p>
                      {calculations.savings > 0 && (
                        <p className="text-sm text-success">
                          Economia: {formatCurrency(calculations.savings)}/mês
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-warning/5 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Implantação / Únicos</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(calculations.implementationTotal)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Fidelidade</p>
                      <p className="text-2xl font-bold text-foreground">
                        {calculations.maxFidelity} meses
                      </p>
                    </div>
                  </div>
                </div>

                {/* Extra Discount on Subtotal */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-medium text-foreground mb-4">Desconto Extra sobre o Subtotal</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Aplique um desconto adicional sobre o valor mensal total. Este desconto não altera os valores individuais dos módulos.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Valor do Desconto (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={extraDiscountValue}
                        onChange={(e) => setExtraDiscountValue(e.target.value)}
                        placeholder="0,00"
                        className="mt-1"
                      />
                    </div>

                    {parseFloat(extraDiscountValue) > 0 && (
                      <>
                        <div>
                          <Label className="text-sm text-muted-foreground">Período do Desconto</Label>
                          <Select
                            value={extraDiscountPeriodType}
                            onValueChange={(value: DiscountPeriodType) => {
                              setExtraDiscountPeriodType(value);
                              if (value !== 'months') setExtraDiscountMonths('');
                              if (value !== 'fixed_date') setExtraDiscountEndDate('');
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
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
                            <Input
                              type="number"
                              min="1"
                              value={extraDiscountMonths}
                              onChange={(e) => setExtraDiscountMonths(e.target.value)}
                              placeholder="Ex: 3"
                              className="mt-1"
                            />
                          </div>
                        )}

                        {extraDiscountPeriodType === 'fixed_date' && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Data Final</Label>
                            <Input
                              type="date"
                              value={extraDiscountEndDate}
                              onChange={(e) => setExtraDiscountEndDate(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {calculations.extraDiscount > 0 && (
                    <div className="mt-4 p-4 bg-success/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Valor Final Mensal com Desconto Extra</p>
                          <p className="text-xs text-muted-foreground">
                            {extraDiscountPeriodType === 'indeterminate' && 'Desconto por tempo indeterminado'}
                            {extraDiscountPeriodType === 'months' && `Desconto válido por ${extraDiscountMonths} meses`}
                            {extraDiscountPeriodType === 'fixed_date' && `Desconto válido até ${new Date(extraDiscountEndDate).toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-success">
                          {formatCurrency(calculations.recurringWithExtraDiscount)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {step === 'review' && selectedClient && legalRep && (
          <div className="space-y-6">
            {/* Contract Summary */}
            <div className="card-elevated p-6">
              <h2 className="section-title">Resumo do Contrato</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-foreground mb-3">Cliente</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Empresa:</span> {selectedClient.trade_name}</p>
                    <p><span className="text-muted-foreground">CNPJ:</span> {selectedClient.cnpj}</p>
                    <p><span className="text-muted-foreground">Representante:</span> {legalRep.legal_name}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-3">Configuração</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="form-label">Data de Início</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="form-label">Dia de Vencimento</Label>
                      <Select value={billingDay} onValueChange={setBillingDay}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20, 25].map(day => (
                            <SelectItem key={day} value={String(day)}>
                              Dia {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Training & Implementation Info */}
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-medium text-foreground mb-4">Dados de Implantação e Treinamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="form-label">Responsável pelo Treinamento</Label>
                    <Input
                      value={trainingContactName}
                      onChange={(e) => setTrainingContactName(e.target.value)}
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div>
                    <Label className="form-label">Telefone do Responsável</Label>
                    <Input
                      value={trainingContactPhone}
                      onChange={(e) => setTrainingContactPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label className="form-label">Tipo de Implantação</Label>
                    <Select value={implementationType} onValueChange={setImplementationType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remota">Remota</SelectItem>
                        <SelectItem value="presencial">Presencial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="form-label">Tipo de Certificado</Label>
                    <Select value={certificateType} onValueChange={setCertificateType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A3">A3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="card-elevated overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="section-title mb-0">Produtos Contratados</h2>
              </div>
              
              {/* Recurring */}
              {selectedProducts.filter(p => p.product.billing_type === 'recurring').length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-muted/30 border-b border-border">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Produtos Recorrentes (Mensal)
                    </h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="px-6 py-3 text-left">Produto</th>
                        <th className="px-6 py-3 text-center">Qtd</th>
                        <th className="px-6 py-3 text-right">Preço Cheio</th>
                        <th className="px-6 py-3 text-center">Desconto</th>
                        <th className="px-6 py-3 text-right">Preço Final</th>
                        <th className="px-6 py-3 text-center">Fidelidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts
                        .filter(p => p.product.billing_type === 'recurring')
                        .map(({ product, quantity, discountPercentage }) => {
                          const fullPrice = Number(product.base_price) * quantity;
                          const discountedPrice = fullPrice * (1 - discountPercentage / 100);
                          return (
                            <tr key={product.id} className="table-row">
                              <td className="px-6 py-4 font-medium">{product.name}</td>
                              <td className="px-6 py-4 text-center">{quantity}</td>
                              <td className="px-6 py-4 text-right">{formatCurrency(fullPrice)}</td>
                              <td className="px-6 py-4 text-center">
                                {discountPercentage > 0 ? `${discountPercentage}%` : '-'}
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-success">
                                {formatCurrency(discountedPrice)}
                              </td>
                              <td className="px-6 py-4 text-center">{product.fidelity_months} meses</td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="px-6 py-4 text-right font-medium">
                          Total Mensal:
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground">
                          {formatCurrency(calculations.recurringDiscounted)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* One-Time / Setup */}
              {(selectedProducts.filter(p => p.product.billing_type === 'one_time').length > 0 ||
                selectedProducts.some(p => p.product.setup_price)) && (
                <div className="border-t border-border">
                  <div className="px-6 py-3 bg-muted/30 border-b border-border">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Setup e Cobranças Únicas
                    </h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="px-6 py-3 text-left">Produto/Serviço</th>
                        <th className="px-6 py-3 text-center">Qtd</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts
                        .filter(p => p.product.billing_type === 'recurring' && p.product.setup_price)
                        .map(({ product, quantity }) => (
                          <tr key={`setup-${product.id}`} className="table-row">
                            <td className="px-6 py-4">Setup - {product.name}</td>
                            <td className="px-6 py-4 text-center">{quantity}</td>
                            <td className="px-6 py-4 text-right">{formatCurrency((Number(product.setup_price) || 0) * quantity)}</td>
                          </tr>
                        ))}
                      {selectedProducts
                        .filter(p => p.product.billing_type === 'one_time')
                        .map(({ product, quantity, discountPercentage }) => {
                          const discountedPrice = Number(product.base_price) * quantity * (1 - discountPercentage / 100);
                          return (
                            <tr key={product.id} className="table-row">
                              <td className="px-6 py-4 font-medium">
                                {product.name}
                                {discountPercentage > 0 && (
                                  <span className="ml-2 text-xs text-success">(-{discountPercentage}%)</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">{quantity}</td>
                              <td className="px-6 py-4 text-right">{formatCurrency(discountedPrice)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={2} className="px-6 py-4 text-right font-medium">
                          Total Implantação/Único:
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground">
                          {formatCurrency(calculations.implementationTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Final Summary */}
            <div className="card-elevated p-6 bg-gradient-hero text-primary-foreground">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-xl font-bold mb-2">Resumo Financeiro</h2>
                  <p className="text-primary-foreground/80">
                    Fidelidade mínima de {calculations.maxFidelity} meses
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-primary-foreground/80 mb-1">Valor Mensal</p>
                  <p className="text-3xl font-bold">{formatCurrency(calculations.recurringWithExtraDiscount)}</p>
                  {calculations.extraDiscount > 0 && (
                    <p className="text-sm text-primary-foreground/70">
                      (Desconto extra: -{formatCurrency(calculations.extraDiscount)})
                    </p>
                  )}
                  {calculations.implementationTotal > 0 && (
                    <p className="text-primary-foreground/80 mt-2">
                      + {formatCurrency(calculations.implementationTotal)} (implantação/único)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={step === 'client'}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          
          {step === 'review' ? (
            <Button onClick={handleCreateContract} className="btn-secondary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Gerar Contrato e PDFs
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNextStep} className="btn-secondary">
              Próximo
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
