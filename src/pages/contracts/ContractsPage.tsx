import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContracts, ContractWithDetails } from '@/hooks/useContracts';
import { generateClientSheetPDF, generateContractPDF } from '@/utils/pdfGenerator';
import { FileDown, FileText, Plus, Search, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ContractsPage() {
  const navigate = useNavigate();
  const { contracts, loading } = useContracts();
  const [search, setSearch] = useState('');

  const filteredContracts = contracts.filter(contract => 
    contract.client?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    contract.client?.trade_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const toPdfContract = (contract: ContractWithDetails) => {
    if (!contract.client) throw new Error('Contrato sem cliente');
    if (!contract.legal_representative) throw new Error('Contrato sem representante legal');

    const products = (contract.products ?? []).map((p) => {
      if (!p.product) throw new Error('Contrato com produto incompleto');
      return {
        ...p,
        product: p.product,
      };
    });

    // pdfGenerator usa apenas alguns campos; montamos um objeto compatível.
    return {
      id: contract.id,
      client_id: contract.client_id,
      client: contract.client,
      legal_representative: contract.legal_representative,
      products,
      recurring_total_full: Number(contract.recurring_total_full),
      recurring_total_discounted: Number(contract.recurring_total_discounted),
      setup_total: Number(contract.setup_total),
      discount_applied_log: (contract.discount_logs ?? []) as any,
      start_date: contract.start_date,
      billing_day: contract.billing_day,
      fidelity_months: contract.fidelity_months,
      status: contract.status as any,
      created_at: contract.created_at,
      updated_at: contract.updated_at,
    } as any;
  };

  const handleDownloadContractPDF = async (contract: ContractWithDetails) => {
    try {
      const pdfContract = toPdfContract(contract);
      await generateContractPDF(pdfContract, { mode: 'download' });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar PDF do contrato');
    }
  };

  const handleDownloadClientSheetPDF = async (contract: ContractWithDetails) => {
    try {
      const pdfContract = toPdfContract(contract);
      await generateClientSheetPDF(pdfContract, { mode: 'download' });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar PDF da ficha do cliente');
    }
  };

  const columns = [
    {
      key: 'client',
      header: 'Cliente',
      render: (contract: ContractWithDetails) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">{contract.client?.trade_name || 'Cliente'}</p>
            <p className="text-sm text-muted-foreground">{contract.products?.length || 0} produto(s)</p>
          </div>
        </div>
      ),
    },
    {
      key: 'recurring',
      header: 'Valor Mensal',
      render: (contract: ContractWithDetails) => (
        <div>
          <p className="font-medium text-foreground">{formatCurrency(Number(contract.recurring_total_discounted))}</p>
          {Number(contract.recurring_total_full) !== Number(contract.recurring_total_discounted) && (
            <p className="text-sm text-muted-foreground line-through">
              {formatCurrency(Number(contract.recurring_total_full))}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'setup',
      header: 'Setup',
      render: (contract: ContractWithDetails) => (
        <span className="text-muted-foreground">
          {Number(contract.setup_total) > 0 ? formatCurrency(Number(contract.setup_total)) : '-'}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: 'Início',
      render: (contract: ContractWithDetails) => (
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
      render: (contract: ContractWithDetails) => (
        <span className="text-muted-foreground">
          {contract.fidelity_months} meses
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (contract: ContractWithDetails) => (
        <StatusBadge status={contract.status as any} />
      ),
    },
    {
      key: 'actions',
      header: 'PDFs',
      className: 'text-right',
      render: (contract: ContractWithDetails) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadContractPDF(contract)}
          >
            <FileDown className="w-4 h-4" />
            Contrato
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadClientSheetPDF(contract)}
          >
            <FileDown className="w-4 h-4" />
            Ficha
          </Button>
        </div>
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
          emptyMessage="Nenhum contrato encontrado com os filtros aplicados"
        />
      </div>
    </AppLayout>
  );
}
