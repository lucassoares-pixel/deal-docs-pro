import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useClients } from '@/hooks/useClients';
import { ArrowLeft, Save, Building2, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditClientPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { clients, legalRepresentatives, loading: clientsLoading, updateClient, getClientById, getLegalRepByClientId } = useClients();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    company_name: '',
    trade_name: '',
    company_type: 'matriz' as 'matriz' | 'filial',
    cnpj: '',
    state_registration: '',
    email: '',
    phone: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    address_complement: '',
    issues_invoice: false,
    tax_regime: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!clientsLoading && id) {
      const client = getClientById(id);
      if (client) {
        setFormData({
          company_name: client.company_name,
          trade_name: client.trade_name,
          company_type: ((client as any).company_type as 'matriz' | 'filial') || 'matriz',
          cnpj: client.cnpj,
          state_registration: (client as any).state_registration || '',
          issues_invoice: (client as any).issues_invoice ?? false,
          tax_regime: (client as any).tax_regime || '',
          email: client.email,
          phone: client.phone,
          address_street: client.address_street,
          address_number: client.address_number,
          address_neighborhood: client.address_neighborhood,
          address_city: client.address_city,
          address_state: client.address_state,
          address_zip: client.address_zip,
          address_complement: (client as any).address_complement || '',
        });
        setIsLoading(false);
      } else if (clients.length > 0) {
        toast.error('Cliente não encontrado');
        navigate('/clients');
      }
    }
  }, [id, clients, clientsLoading, getClientById, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.company_name) newErrors.company_name = 'Razão social é obrigatória';
    if (!formData.trade_name) newErrors.trade_name = 'Nome fantasia é obrigatório';
    if (!formData.cnpj) newErrors.cnpj = 'CNPJ é obrigatório';
    if (!formData.email) newErrors.email = 'E-mail é obrigatório';
    if (!formData.phone) newErrors.phone = 'Telefone é obrigatório';
    if (!formData.address_street) newErrors.address_street = 'Endereço é obrigatório';
    if (!formData.address_city) newErrors.address_city = 'Cidade é obrigatória';
    if (!formData.address_state) newErrors.address_state = 'Estado é obrigatório';
    if (!formData.address_zip) newErrors.address_zip = 'CEP é obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateClient(id, {
        company_name: formData.company_name,
        trade_name: formData.trade_name,
        cnpj: formData.cnpj,
        state_registration: formData.state_registration || null,
        email: formData.email,
        phone: formData.phone,
        address_street: formData.address_street,
        address_number: formData.address_number,
        address_neighborhood: formData.address_neighborhood,
        address_city: formData.address_city,
        address_state: formData.address_state,
        address_zip: formData.address_zip,
        address_complement: formData.address_complement || '',
        company_type: formData.company_type,
        issues_invoice: formData.issues_invoice,
        tax_regime: formData.tax_regime || null,
      } as any);

      if (result) {
        toast.success('Cliente atualizado com sucesso!');
        navigate('/clients');
      }
    } catch (error) {
      toast.error('Erro ao atualizar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (clientsLoading || isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Editar Cliente"
          subtitle="Carregando dados do cliente..."
          actions={
            <Button variant="outline" onClick={() => navigate('/clients')}>
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          }
        />
        <div className="space-y-6">
          <div className="card-elevated p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Editar Cliente"
        subtitle="Atualize as informações do cliente"
        actions={
          <Button variant="outline" onClick={() => navigate('/clients')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Dados da Empresa</h2>
              <p className="text-sm text-muted-foreground">Informações cadastrais do cliente</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="form-label">Razão Social *</Label>
              <Input
                value={formData.company_name}
                onChange={handleChange('company_name')}
                placeholder="Empresa Ltda"
                className={errors.company_name ? 'border-destructive' : ''}
              />
              {errors.company_name && <p className="form-error">{errors.company_name}</p>}
            </div>

            <div>
              <Label className="form-label">Nome Fantasia *</Label>
              <Input
                value={formData.trade_name}
                onChange={handleChange('trade_name')}
                placeholder="Nome Comercial"
                className={errors.trade_name ? 'border-destructive' : ''}
              />
              {errors.trade_name && <p className="form-error">{errors.trade_name}</p>}
            </div>

            <div>
              <Label className="form-label">Tipo de Empresa *</Label>
              <Select
                value={formData.company_type}
                onValueChange={(value: 'matriz' | 'filial') => setFormData(prev => ({ ...prev, company_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matriz">Matriz</SelectItem>
                  <SelectItem value="filial">Filial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="form-label">CNPJ *</Label>
              <Input
                value={formData.cnpj}
                onChange={handleChange('cnpj')}
                placeholder="00.000.000/0000-00"
                className={errors.cnpj ? 'border-destructive' : ''}
              />
              {errors.cnpj && <p className="form-error">{errors.cnpj}</p>}
            </div>

            <div>
              <Label className="form-label">Inscrição Estadual</Label>
              <Input
                value={formData.state_registration}
                onChange={handleChange('state_registration')}
                placeholder="Inscrição Estadual"
              />
            </div>

            <div>
              <Label className="form-label">Emite Nota Fiscal</Label>
              <Select
                value={formData.issues_invoice ? 'sim' : 'nao'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, issues_invoice: value === 'sim' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="form-label">Regime Tributário</Label>
              <Select
                value={formData.tax_regime}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tax_regime: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  <SelectItem value="mei">MEI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="form-label">E-mail *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="contato@empresa.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div>
              <Label className="form-label">Telefone *</Label>
              <Input
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder="(00) 00000-0000"
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && <p className="form-error">{errors.phone}</p>}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-foreground mb-4">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label className="form-label">Logradouro *</Label>
                <Input
                  value={formData.address_street}
                  onChange={handleChange('address_street')}
                  placeholder="Rua, Avenida..."
                  className={errors.address_street ? 'border-destructive' : ''}
                />
              </div>

              <div>
                <Label className="form-label">Número</Label>
                <Input
                  value={formData.address_number}
                  onChange={handleChange('address_number')}
                  placeholder="123"
                />
              </div>

              <div>
                <Label className="form-label">Bairro</Label>
                <Input
                  value={formData.address_neighborhood}
                  onChange={handleChange('address_neighborhood')}
                  placeholder="Centro"
                />
              </div>

              <div>
                <Label className="form-label">Cidade *</Label>
                <Input
                  value={formData.address_city}
                  onChange={handleChange('address_city')}
                  placeholder="São Paulo"
                  className={errors.address_city ? 'border-destructive' : ''}
                />
              </div>

              <div>
                <Label className="form-label">Estado *</Label>
                <Input
                  value={formData.address_state}
                  onChange={handleChange('address_state')}
                  placeholder="SP"
                  maxLength={2}
                  className={errors.address_state ? 'border-destructive' : ''}
                />
              </div>

              <div>
                <Label className="form-label">CEP *</Label>
                <Input
                  value={formData.address_zip}
                  onChange={handleChange('address_zip')}
                  placeholder="00000-000"
                  className={errors.address_zip ? 'border-destructive' : ''}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/clients')}>
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
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
