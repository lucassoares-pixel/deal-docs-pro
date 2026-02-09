import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/hooks/useClients';
import { Tables } from '@/integrations/supabase/types';
import { Users, Plus, Search, Building2, Mail, Phone, Loader2 } from 'lucide-react';

type Client = Tables<'clients'>;

export default function ClientsPage() {
  const navigate = useNavigate();
  const { clients, loading } = useClients();
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter(client => 
    client.company_name.toLowerCase().includes(search.toLowerCase()) ||
    client.trade_name.toLowerCase().includes(search.toLowerCase()) ||
    client.cnpj.includes(search)
  );

  const columns = [
    {
      key: 'company',
      header: 'Empresa',
      render: (client: Client) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">{client.trade_name}</p>
            <p className="text-sm text-muted-foreground">{client.company_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (client: Client) => (
        <span className={(client as any).company_type === 'matriz' ? 'badge-info' : 'badge-warning'}>
          {(client as any).company_type === 'matriz' ? 'Matriz' : 'Filial'}
        </span>
      ),
    },
    {
      key: 'cnpj',
      header: 'CNPJ',
      render: (client: Client) => (
        <span className="font-mono text-sm text-muted-foreground">{client.cnpj}</span>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (client: Client) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{client.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{client.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Localização',
      render: (client: Client) => (
        <span className="text-muted-foreground">
          {client.address_city}, {client.address_state}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (clients.length === 0) {
    return (
      <AppLayout>
        <PageHeader 
          title="Clientes"
          subtitle="Gerencie sua base de clientes"
        />
        <div className="card-elevated">
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum cliente cadastrado"
            description="Comece cadastrando seu primeiro cliente para criar contratos."
            action={
              <Button onClick={() => navigate('/clients/new')} className="btn-secondary">
                <Plus className="w-4 h-4" />
                Novo Cliente
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Clientes"
        subtitle={`${clients.length} cliente(s) cadastrado(s)`}
        actions={
          <Button onClick={() => navigate('/clients/new')} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        }
      />

      <div className="card-elevated">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, razão social ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredClients}
          keyExtractor={(client) => client.id}
          onRowClick={(client) => navigate(`/clients/${client.id}`)}
          emptyMessage="Nenhum cliente encontrado com os filtros aplicados"
        />
      </div>
    </AppLayout>
  );
}
