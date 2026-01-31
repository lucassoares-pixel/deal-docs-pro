import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClients } from '@/hooks/useClients';
import { ArrowLeft, Save, Building2, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NewClientPage() {
  const navigate = useNavigate();
  const { addClient, addLegalRepresentative } = useClients();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    company_name: '',
    trade_name: '',
    cnpj: '',
    email: '',
    phone: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    legal_name: '',
    legal_cpf: '',
    legal_role: '',
    legal_email: '',
    legal_phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!formData.legal_name) newErrors.legal_name = 'Nome do representante é obrigatório';
    if (!formData.legal_cpf) newErrors.legal_cpf = 'CPF é obrigatório';
    if (!formData.legal_role) newErrors.legal_role = 'Cargo é obrigatório';
    if (!formData.legal_email) newErrors.legal_email = 'E-mail do representante é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const clientData = await addClient({
        company_name: formData.company_name,
        trade_name: formData.trade_name,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        address_street: formData.address_street,
        address_number: formData.address_number,
        address_neighborhood: formData.address_neighborhood,
        address_city: formData.address_city,
        address_state: formData.address_state,
        address_zip: formData.address_zip,
      });

      if (clientData) {
        await addLegalRepresentative({
          client_id: clientData.id,
          legal_name: formData.legal_name,
          cpf: formData.legal_cpf,
          role: formData.legal_role,
          email: formData.legal_email,
          phone: formData.legal_phone,
        });

        toast.success('Cliente cadastrado com sucesso!');
        navigate('/clients');
      }
    } catch (error) {
      toast.error('Erro ao cadastrar cliente');
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

  return (
    <AppLayout>
      <PageHeader 
        title="Novo Cliente"
        subtitle="Cadastre um novo cliente no sistema"
        actions={
          <Button variant="outline" onClick={() => navigate('/clients')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
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

        {/* Legal Representative */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Representante Legal</h2>
              <p className="text-sm text-muted-foreground">Pessoa responsável pela assinatura do contrato</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="form-label">Nome Completo *</Label>
              <Input
                value={formData.legal_name}
                onChange={handleChange('legal_name')}
                placeholder="Nome do representante"
                className={errors.legal_name ? 'border-destructive' : ''}
              />
              {errors.legal_name && <p className="form-error">{errors.legal_name}</p>}
            </div>

            <div>
              <Label className="form-label">CPF *</Label>
              <Input
                value={formData.legal_cpf}
                onChange={handleChange('legal_cpf')}
                placeholder="000.000.000-00"
                className={errors.legal_cpf ? 'border-destructive' : ''}
              />
              {errors.legal_cpf && <p className="form-error">{errors.legal_cpf}</p>}
            </div>

            <div>
              <Label className="form-label">Cargo *</Label>
              <Input
                value={formData.legal_role}
                onChange={handleChange('legal_role')}
                placeholder="CEO, Diretor, etc."
                className={errors.legal_role ? 'border-destructive' : ''}
              />
              {errors.legal_role && <p className="form-error">{errors.legal_role}</p>}
            </div>

            <div>
              <Label className="form-label">E-mail *</Label>
              <Input
                type="email"
                value={formData.legal_email}
                onChange={handleChange('legal_email')}
                placeholder="representante@empresa.com"
                className={errors.legal_email ? 'border-destructive' : ''}
              />
              {errors.legal_email && <p className="form-error">{errors.legal_email}</p>}
            </div>

            <div>
              <Label className="form-label">Telefone</Label>
              <Input
                value={formData.legal_phone}
                onChange={handleChange('legal_phone')}
                placeholder="(00) 00000-0000"
              />
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
                Salvar Cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
