import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangeFilter, useDateRangeFilter } from '@/components/ui/date-range-filter';
import { useContracts, ContractWithDetails } from '@/hooks/useContracts';
import { generateClientSheetPDF, generateContractPDF } from '@/utils/pdfGenerator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileDown, FileText, Plus, Search, Calendar, Loader2, Trash2, XCircle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ContractsPage() {
  const navigate = useNavigate();
  const { contracts, loading, updateContractStatus, deleteContract, toggleSigned } = useContracts();
  const [search, setSearch] = useState('');
  const { preset, setPreset, dateRange, setDateRange, filterByDate } = useDateRangeFilter('month');

  const dateFilteredContracts = filterByDate(contracts, (c) => c.created_at);

  const filteredContracts = dateFilteredContracts.filter(contract => 
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

  const handleCancelContract = async (contract: ContractWithDetails) => {
    const result = await updateContractStatus(contract.id, 'cancelled');
    if (result) {
      toast.success('Contrato cancelado com sucesso');
    }
  };

  const handleDeleteContract = async (contract: ContractWithDetails) => {
    await deleteContract(contract.id);
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
      key: 'modules',
      header: 'Módulos',
      render: (contract: ContractWithDetails) => {
        const totalQty = (contract.products ?? []).reduce((sum, p) => sum + (p.quantity || 1), 0);
        return (
          <span className="font-medium text-foreground">{totalQty}</span>
        );
      },
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
      key: 'signed',
      header: 'Assinado',
      render: (contract: ContractWithDetails) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={(contract as any).signed === true}
            onCheckedChange={() => toggleSigned(contract.id, !(contract as any).signed)}
          />
        </div>
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
      header: 'Ações',
      className: 'text-right',
      render: (contract: ContractWithDetails) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${contract.id}`); }}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleDownloadContractPDF(contract); }}
          >
            <FileDown className="w-4 h-4" />
            Contrato
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleDownloadClientSheetPDF(contract); }}
          >
            <FileDown className="w-4 h-4" />
            Ficha
          </Button>
          {contract.status === 'active' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-warning hover:text-warning"
                  onClick={(e) => e.stopPropagation()}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar contrato?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O contrato de {contract.client?.trade_name} será marcado como cancelado. Ele não aparecerá mais nos contratos ativos e não será contabilizado na receita recorrente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-warning text-warning-foreground hover:bg-warning/90"
                    onClick={() => handleCancelContract(contract)}
                  >
                    Cancelar Contrato
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. O contrato de {contract.client?.trade_name} e todos os dados associados serão permanentemente excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => handleDeleteContract(contract)}
                >
                  Excluir Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
        subtitle={`${filteredContracts.length} contrato(s) no período`}
        actions={
          <Button onClick={() => navigate('/contracts/new')} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Novo Contrato
          </Button>
        }
      />

      {/* Date Filter */}
      <div className="mb-4">
        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          preset={preset}
          onPresetChange={setPreset}
        />
      </div>

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
