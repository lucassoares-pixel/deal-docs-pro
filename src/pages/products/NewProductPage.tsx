import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/context/AppContext';
import { Product, BillingType } from '@/types';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProductPage() {
  const navigate = useNavigate();
  const { addProduct } = useProducts();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    billing_type: 'recurring' as BillingType,
    base_price: '',
    setup_price: '',
    allow_discount: true,
    max_discount_percentage: '20',
    fidelity_months: '12',
    active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Nome é obrigatório';
    if (!formData.description) newErrors.description = 'Descrição é obrigatória';
    if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
      newErrors.base_price = 'Preço base deve ser maior que zero';
    }
    if (formData.allow_discount) {
      const maxDiscount = parseFloat(formData.max_discount_percentage);
      if (isNaN(maxDiscount) || maxDiscount < 0 || maxDiscount > 100) {
        newErrors.max_discount_percentage = 'Desconto deve estar entre 0% e 100%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    const now = new Date().toISOString();

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      billing_type: formData.billing_type,
      recurring_period: formData.billing_type === 'recurring' ? 'monthly' : null,
      base_price: parseFloat(formData.base_price),
      setup_price: formData.setup_price ? parseFloat(formData.setup_price) : null,
      allow_discount: formData.allow_discount,
      max_discount_percentage: formData.allow_discount ? parseFloat(formData.max_discount_percentage) : 0,
      fidelity_months: parseInt(formData.fidelity_months) || 0,
      active: formData.active,
      created_at: now,
      updated_at: now,
    };

    addProduct(newProduct);
    toast.success('Produto cadastrado com sucesso!');
    navigate('/products');
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Novo Produto"
        subtitle="Adicione um novo produto ao catálogo"
        actions={
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Informações do Produto</h2>
              <p className="text-sm text-muted-foreground">Dados básicos do produto ou serviço</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label className="form-label">Nome do Produto *</Label>
              <Input
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="Ex: CRM Pro"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            <div className="md:col-span-2">
              <Label className="form-label">Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={handleChange('description')}
                placeholder="Descrição detalhada do produto ou serviço..."
                rows={3}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && <p className="form-error">{errors.description}</p>}
            </div>

            <div>
              <Label className="form-label">Tipo de Cobrança *</Label>
              <Select
                value={formData.billing_type}
                onValueChange={(value: BillingType) => setFormData(prev => ({ ...prev, billing_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recorrente (Mensal)</SelectItem>
                  <SelectItem value="one_time">Cobrança Única</SelectItem>
                </SelectContent>
              </Select>
              <p className="form-helper">
                {formData.billing_type === 'recurring' 
                  ? 'Cobrado mensalmente na fatura do cliente'
                  : 'Cobrado uma única vez no início do contrato'}
              </p>
            </div>

            <div>
              <Label className="form-label">Preço Base (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price}
                onChange={handleChange('base_price')}
                placeholder="0,00"
                className={errors.base_price ? 'border-destructive' : ''}
              />
              {errors.base_price && <p className="form-error">{errors.base_price}</p>}
            </div>

            {formData.billing_type === 'recurring' && (
              <div>
                <Label className="form-label">Taxa de Setup (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.setup_price}
                  onChange={handleChange('setup_price')}
                  placeholder="0,00 (opcional)"
                />
                <p className="form-helper">Cobrado uma vez no início do contrato</p>
              </div>
            )}

            <div>
              <Label className="form-label">Fidelidade (meses)</Label>
              <Input
                type="number"
                min="0"
                value={formData.fidelity_months}
                onChange={handleChange('fidelity_months')}
                placeholder="12"
              />
              <p className="form-helper">Período mínimo de contratação</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6">
          <h2 className="font-semibold text-foreground mb-6">Regras de Desconto</h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="form-label mb-0">Permitir Desconto</Label>
                <p className="form-helper mt-0">Vendedores podem aplicar desconto neste produto</p>
              </div>
              <Switch
                checked={formData.allow_discount}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_discount: checked }))}
              />
            </div>

            {formData.allow_discount && (
              <div className="max-w-xs">
                <Label className="form-label">Desconto Máximo (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.max_discount_percentage}
                  onChange={handleChange('max_discount_percentage')}
                  placeholder="20"
                  className={errors.max_discount_percentage ? 'border-destructive' : ''}
                />
                {errors.max_discount_percentage && (
                  <p className="form-error">{errors.max_discount_percentage}</p>
                )}
                <p className="form-helper">Limite máximo de desconto permitido para vendedores</p>
              </div>
            )}
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="form-label mb-0">Produto Ativo</Label>
              <p className="form-helper mt-0">Produtos inativos não aparecem para seleção em novos contratos</p>
            </div>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/products')}>
            Cancelar
          </Button>
          <Button type="submit" className="btn-secondary">
            <Save className="w-4 h-4" />
            Salvar Produto
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
