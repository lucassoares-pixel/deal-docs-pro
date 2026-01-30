import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients, useProducts, useContracts, useCurrentUser } from '@/context/AppContext';
import { Product, ContractProduct, DiscountLog, Contract, Client, LegalRepresentative } from '@/types';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Package, 
  Users, 
  FileText, 
  AlertCircle,
  Plus,
  Minus,
  Percent,
  DollarSign,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { generateContractPDF, generateClientSheetPDF } from '@/utils/pdfGenerator';

type Step = 'client' | 'products' | 'review';

interface SelectedProduct {
  product: Product;
  quantity: number;
  discountPercentage: number;
}

export default function ContractBuilderPage() {
  const navigate = useNavigate();
  const { clients, getLegalRepByClientId } = useClients();
  const { activeProducts } = useProducts();
  const { addContract } = useContracts();
  const currentUser = useCurrentUser();

  const [step, setStep] = useState<Step>('client');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [billingDay, setBillingDay] = useState('5');

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const legalRep = selectedClientId ? getLegalRepByClientId(selectedClientId) : undefined;

  // Separate products by type
  const recurringProducts = activeProducts.filter(p => p.billing_type === 'recurring');
  const oneTimeProducts = activeProducts.filter(p => p.billing_type === 'one_time');

  // Calculate totals
  const calculations = useMemo(() => {
    let recurringFull = 0;
    let recurringDiscounted = 0;
    let setupTotal = 0;

    selectedProducts.forEach(({ product, quantity, discountPercentage }) => {
      if (product.billing_type === 'recurring') {
        const full = product.base_price * quantity;
        const discounted = full * (1 - discountPercentage / 100);
        recurringFull += full;
        recurringDiscounted += discounted;
        
        if (product.setup_price) {
          setupTotal += product.setup_price * quantity;
        }
      } else {
        const full = product.base_price * quantity;
        const discounted = full * (1 - discountPercentage / 100);
        setupTotal += discounted;
      }
    });

    const maxFidelity = Math.max(
      ...selectedProducts.map(p => p.product.fidelity_months),
      0
    );

    return {
      recurringFull,
      recurringDiscounted,
      setupTotal,
      maxFidelity,
      savings: recurringFull - recurringDiscounted,
    };
  }, [selectedProducts]);

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
      setSelectedProducts(prev => [...prev, { product, quantity: 1, discountPercentage: 0 }]);
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
    const product = selectedProducts.find(p => p.product.id === productId);
    if (!product) return;

    if (!product.product.allow_discount) {
      toast.error('Este produto não permite desconto');
      return;
    }

    if (discount > product.product.max_discount_percentage) {
      toast.error(`Desconto máximo permitido: ${product.product.max_discount_percentage}%`);
      return;
    }

    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, discountPercentage: Math.max(0, discount) } : p
      )
    );
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

  const handleCreateContract = () => {
    if (!selectedClient || !legalRep) {
      toast.error('Dados do cliente incompletos');
      return;
    }

    const now = new Date().toISOString();

    const contractProducts: ContractProduct[] = selectedProducts.map(({ product, quantity, discountPercentage }) => ({
      product_id: product.id,
      product,
      quantity,
      discount_percentage: discountPercentage,
      full_price: product.base_price * quantity,
      discounted_price: product.base_price * quantity * (1 - discountPercentage / 100),
    }));

    const discountLogs: DiscountLog[] = selectedProducts
      .filter(p => p.discountPercentage > 0)
      .map(({ product, quantity, discountPercentage }) => ({
        product_id: product.id,
        product_name: product.name,
        original_price: product.base_price * quantity,
        discount_percentage: discountPercentage,
        discounted_price: product.base_price * quantity * (1 - discountPercentage / 100),
        applied_at: now,
        applied_by: currentUser.name,
      }));

    const newContract: Contract = {
      id: `contract-${Date.now()}`,
      client_id: selectedClient.id,
      client: selectedClient,
      legal_representative: legalRep,
      products: contractProducts,
      recurring_total_full: calculations.recurringFull,
      recurring_total_discounted: calculations.recurringDiscounted,
      setup_total: calculations.setupTotal,
      discount_applied_log: discountLogs,
      start_date: startDate,
      billing_day: parseInt(billingDay),
      fidelity_months: calculations.maxFidelity,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    addContract(newContract);
    
    // Generate PDFs
    generateContractPDF(newContract);
    generateClientSheetPDF(newContract);

    toast.success('Contrato criado com sucesso! PDFs gerados.');
    navigate('/contracts');
  };

  const steps = [
    { id: 'client', label: 'Cliente', icon: Users },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'review', label: 'Revisão', icon: FileText },
  ];

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
            {/* Product Selection */}
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
                                {formatCurrency(product.base_price)}/mês
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
                                {formatCurrency(product.base_price)}
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

            {/* Selected Products with Discount Configuration */}
            {selectedProducts.length > 0 && (
              <div className="card-elevated p-6">
                <h2 className="section-title">Produtos Selecionados</h2>
                <div className="space-y-4">
                  {selectedProducts.map(({ product, quantity, discountPercentage }) => {
                    const fullPrice = product.base_price * quantity;
                    const discountedPrice = fullPrice * (1 - discountPercentage / 100);
                    
                    return (
                      <div key={product.id} className="p-4 bg-muted/30 rounded-lg">
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

                            {/* Discount */}
                            <div className="flex items-center gap-2">
                              <Label className="text-sm text-muted-foreground">Desc:</Label>
                              <div className="relative w-20">
                                <Input
                                  type="number"
                                  min="0"
                                  max={product.max_discount_percentage}
                                  value={discountPercentage}
                                  onChange={(e) => handleDiscountChange(product.id, parseFloat(e.target.value) || 0)}
                                  className="pr-6 text-right"
                                  disabled={!product.allow_discount}
                                />
                                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              </div>
                              {!product.allow_discount && (
                                <span className="text-xs text-muted-foreground">(não permitido)</span>
                              )}
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
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-accent/5 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Recorrente Mensal</p>
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
                      <p className="text-sm text-muted-foreground mb-1">Setup / Únicos</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(calculations.setupTotal)}
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
                          const fullPrice = product.base_price * quantity;
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
                            <td className="px-6 py-4 text-right">{formatCurrency((product.setup_price || 0) * quantity)}</td>
                          </tr>
                        ))}
                      {selectedProducts
                        .filter(p => p.product.billing_type === 'one_time')
                        .map(({ product, quantity, discountPercentage }) => {
                          const discountedPrice = product.base_price * quantity * (1 - discountPercentage / 100);
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
                          Total Setup/Único:
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground">
                          {formatCurrency(calculations.setupTotal)}
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
                  <p className="text-3xl font-bold">{formatCurrency(calculations.recurringDiscounted)}</p>
                  {calculations.setupTotal > 0 && (
                    <p className="text-primary-foreground/80 mt-2">
                      + {formatCurrency(calculations.setupTotal)} (setup/único)
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
            <Button onClick={handleCreateContract} className="btn-secondary">
              <FileText className="w-4 h-4" />
              Gerar Contrato e PDFs
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
