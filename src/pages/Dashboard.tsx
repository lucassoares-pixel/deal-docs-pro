import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useClients } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { useContracts } from '@/hooks/useContracts';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { 
  Users, 
  Package, 
  FileText, 
  DollarSign, 
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const { clients, loading: loadingClients } = useClients();
  const { products, activeProducts, loading: loadingProducts } = useProducts();
  const { contracts, loading: loadingContracts } = useContracts();
  const { auditLogs, loading: loadingAudit } = useAuditLogs();

  const loading = loadingClients || loadingProducts || loadingContracts || loadingAudit;

  // Calculate stats
  const activeContracts = contracts.filter(c => c.status === 'active');
  const signedContracts = activeContracts.filter(c => (c as any).signed === true);
  const totalRecurringRevenue = activeContracts.reduce((acc, c) => acc + Number(c.recurring_total_discounted), 0);
  const confirmedRevenue = signedContracts.reduce((acc, c) => acc + Number(c.recurring_total_discounted), 0);
  
  const recentContracts = contracts.slice(0, 5);
  const recentLogs = auditLogs.slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
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
        title="Dashboard"
        subtitle="Visão geral do sistema de contratos"
        actions={
          <Button onClick={() => navigate('/contracts/new')} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Novo Contrato
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Clientes Ativos"
          value={clients.length}
          icon={Users}
        />
        <StatCard
          title="Produtos Ativos"
          value={activeProducts.length}
          subtitle={`de ${products.length} total`}
          icon={Package}
        />
        <StatCard
          title="Contratos Ativos"
          value={activeContracts.length}
          subtitle={`${signedContracts.length} assinado(s) de ${contracts.length} total`}
          icon={FileText}
        />
        <StatCard
          title="Receita Recorrente"
          value={formatCurrency(totalRecurringRevenue)}
          subtitle={`${formatCurrency(confirmedRevenue)} confirmada (assinados)`}
          icon={DollarSign}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contracts */}
        <div className="card-elevated">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Contratos Recentes</h2>
                  <p className="text-sm text-muted-foreground">Últimos contratos criados</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/contracts')}
                className="text-accent hover:text-accent/80"
              >
                Ver todos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {recentContracts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Nenhum contrato encontrado
              </div>
            ) : (
              recentContracts.map((contract) => (
                <div 
                  key={contract.id} 
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{contract.client?.trade_name || 'Cliente'}</p>
                      <p className="text-sm text-muted-foreground">
                        {contract.products?.length || 0} produto(s) • {formatCurrency(Number(contract.recurring_total_discounted))}/mês
                      </p>
                    </div>
                    <StatusBadge status={contract.status as any} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-elevated">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Atividade Recente</h2>
                  <p className="text-sm text-muted-foreground">Últimas ações no sistema</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/audit')}
                className="text-accent hover:text-accent/80"
              >
                Ver histórico
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {recentLogs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Nenhuma atividade registrada
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{log.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.user_name} • {format(new Date(log.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="section-title">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/clients/new')}
            className="card-elevated p-6 text-left hover:border-accent transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Novo Cliente</h3>
            <p className="text-sm text-muted-foreground">Cadastrar um novo cliente</p>
          </button>

          <button 
            onClick={() => navigate('/products/new')}
            className="card-elevated p-6 text-left hover:border-accent transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <Package className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Novo Produto</h3>
            <p className="text-sm text-muted-foreground">Adicionar produto ao catálogo</p>
          </button>

          <button 
            onClick={() => navigate('/contracts/new')}
            className="card-elevated p-6 text-left hover:border-accent transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Novo Contrato</h3>
            <p className="text-sm text-muted-foreground">Criar contrato para cliente</p>
          </button>

          <button 
            onClick={() => navigate('/products')}
            className="card-elevated p-6 text-left hover:border-accent transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <DollarSign className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Gerenciar Preços</h3>
            <p className="text-sm text-muted-foreground">Atualizar preços e descontos</p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
