import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Package, Save, Loader2 } from 'lucide-react';
import { useSelectionFields } from '@/hooks/useSelectionFields';

type BillingType = 'recurring' | 'one_time';
type ProductType = 'primary' | 'secondary';

export interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  category: string;
  product_group: string;
  brand: string;
  billing_type: BillingType;
  product_type: ProductType;
  base_price: string;
  setup_price: string;
  cost_price: string;
  cas_price: string;
  allow_discount: boolean;
  max_discount_percentage: string;
  fidelity_months: string;
  active: boolean;
  is_anchor: boolean;
  has_auto_discount: boolean;
  auto_discount_percentage: string;
}

interface ProductFormProps {
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  isAdmin?: boolean;
}

const defaultFormData: ProductFormData = {
  name: '',
  sku: '',
  description: '',
  category: '',
  product_group: '',
  brand: '',
  billing_type: 'recurring',
  product_type: 'primary',
  base_price: '',
  setup_price: '',
  cost_price: '',
  cas_price: '',
  allow_discount: true,
  max_discount_percentage: '20',
  fidelity_months: '12',
  active: true,
  is_anchor: false,
  has_auto_discount: false,
  auto_discount_percentage: '',
};

export function ProductForm({ 
  initialData = defaultFormData, 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  submitLabel,
  isAdmin = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { getByType } = useSelectionFields();
  const brands = getByType('brand');
  const categories = getByType('category');
  const productGroups = getByType('product_group');

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
    if (formData.has_auto_discount) {
      const autoDiscount = parseFloat(formData.auto_discount_percentage);
      if (isNaN(autoDiscount) || autoDiscount <= 0 || autoDiscount > 100) {
        newErrors.auto_discount_percentage = 'Percentual de desconto automático deve estar entre 0% e 100%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
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
          <div>
            <Label className="form-label">Nome do Produto *</Label>
            <Input
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Ex: CRM Pro"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div>
            <Label className="form-label">SKU</Label>
            <Input
              value={formData.sku}
              onChange={handleChange('sku')}
              placeholder="Ex: CRM-PRO-001"
            />
            <p className="form-helper">Código de identificação do produto</p>
          </div>

          <div>
            <Label className="form-label">Categoria</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.value}>{c.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="form-label">Grupo</Label>
            <Select
              value={formData.product_group}
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_group: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                {productGroups.map(g => (
                  <SelectItem key={g.id} value={g.value}>{g.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="form-label">Fornecedor</Label>
            <Select
              value={formData.brand}
              onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {brands.map(b => (
                  <SelectItem key={b.id} value={b.value}>{b.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label className="form-label">Tipo de Módulo *</Label>
            <Select
              value={formData.product_type}
              onValueChange={(value: ProductType) => setFormData(prev => ({ ...prev, product_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Módulo Principal</SelectItem>
                <SelectItem value="secondary">Módulo Secundário</SelectItem>
              </SelectContent>
            </Select>
            <p className="form-helper">
              {formData.product_type === 'primary'
                ? 'Módulo principal do sistema'
                : 'Módulo complementar/adicional'}
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
              <Label className="form-label">Valor de Implantação (R$)</Label>
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

          {isAdmin && (
            <div>
              <Label className="form-label">CAS - Custo de Aquisição (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.cas_price}
                onChange={handleChange('cas_price')}
                placeholder="0,00"
              />
              <p className="form-helper">Preço pago pelo módulo/sistema ao fornecedor</p>
            </div>
          )}
        </div>
      </div>

      <div className="card-elevated p-6">
        <h2 className="font-semibold text-foreground mb-6">Regras Especiais</h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="form-label mb-0">Produto Âncora</Label>
              <p className="form-helper mt-0">Marca este produto como âncora (ex: Multiempresa). Quando ativo em um contrato, ativa regras automáticas de desconto em outros produtos.</p>
            </div>
            <Switch
              checked={formData.is_anchor}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_anchor: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="form-label mb-0">Produto com Incidência de Desconto Automático</Label>
              <p className="form-helper mt-0">Quando um produto âncora estiver ativo no contrato, este produto receberá desconto automático.</p>
            </div>
            <Switch
              checked={formData.has_auto_discount}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_auto_discount: checked, auto_discount_percentage: checked ? formData.auto_discount_percentage : '' }))}
            />
          </div>

          {formData.has_auto_discount && (
            <div className="max-w-xs">
              <Label className="form-label">Percentual de Desconto Automático (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.auto_discount_percentage}
                onChange={handleChange('auto_discount_percentage')}
                placeholder="Ex: 10"
                className={errors.auto_discount_percentage ? 'border-destructive' : ''}
              />
              {errors.auto_discount_percentage && (
                <p className="form-error">{errors.auto_discount_percentage}</p>
              )}
              <p className="form-helper">Desconto aplicado automaticamente quando o produto âncora estiver no contrato. Não pode ser removido manualmente.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card-elevated p-6">
        <h2 className="font-semibold text-foreground mb-6">Regras de Desconto Manual</h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="form-label mb-0">Permitir Desconto Manual</Label>
              <p className="form-helper mt-0">Vendedores podem aplicar desconto adicional neste produto</p>
            </div>
            <Switch
              checked={formData.allow_discount}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_discount: checked }))}
            />
          </div>

          {formData.allow_discount && (
            <div className="max-w-xs">
              <Label className="form-label">Desconto Manual Máximo (%)</Label>
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
              <p className="form-helper">Limite máximo de desconto manual permitido. Aplicado após o desconto automático, se houver.</p>
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

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="btn-secondary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
