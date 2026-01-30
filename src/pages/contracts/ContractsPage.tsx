import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContracts } from '@/context/AppContext';
import { Contract } from '@/types';
import { FileText, Plus, Search, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ContractsPage() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const [search, setSearch] = useState('');

  const filteredContracts = contracts.filter(contract => 
    contract.client.company_name.toLowerCase().includes(search.toLowerCase()) ||
    contract.client.trade_name.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const columns = [
    {
      key: 'client',
      header: 'Cliente',
      render: (contract: Contract) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">{contract.client.trade_name}</p>
            <p className="text-sm text-muted-foreground">{contract.products.length} produto(s)</p>
          </div>
        </div>
      ),
    },
    {
      key: 'recurring',
      header: 'Valor Mensal',
      render: (contract: Contract) => (
        <div>
          <p className="font-medium text-foreground">{formatCurrency(contract.recurring_total_discounted)}</p>
          {contract.recurring_total_full !== contract.recurring_total_discounted && (
            <p className="text-sm text-muted-foreground line-through">
              {formatCurrency(contract.recurring_total_full)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'setup',
      header: 'Setup',
      render: (contract: Contract) => (
        <span className="text-muted-foreground">
          {contract.setup_total > 0 ? formatCurrency(contract.setup_total) : '-'}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: 'Início',
      render: (contract: Contract) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {format(new Date(contract.start_date), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
      ),
    },
    {
      key: 'fidelity',
      header: 'Fidelidade',
      render: (contract: Contract) => (
        <span className="text-muted-foreground">
          {contract.fidelity_months} meses
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (contract: Contract) => (
        <StatusBadge status={contract.status} />
      ),
    },
  ];

  if (contracts.length === 0) {
    return (
      <AppLayout>
        <PageHeader 
          title="Contratos"
          subtitle="Gerencie os contratos da sua empresa"
        />
        <div className="card-elevated">
          <EmptyState
            icon={<FileText className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum contrato criado"
            description="Crie seu primeiro contrato selecionando um cliente e produtos."
            action={
              <Button onClick={() => navigate('/contracts/new')} className="btn-secondary">
                <Plus className="w-4 h-4" />
                Novo Contrato
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
        title="Contratos"
        subtitle={`${contracts.length} contrato(s) no sistema`}
        actions={
          <Button onClick={() => navigate('/contracts/new')} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Novo Contrato
          </Button>
        }
      />

      <div className="card-elevated">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredContracts}
          keyExtractor={(contract) => contract.id}
          onRowClick={(contract) => navigate(`/contracts/${contract.id}`)}
          emptyMessage="Nenhum contrato encontrado com os filtros aplicados"
        />
      </div>
    </AppLayout>
  );
}
