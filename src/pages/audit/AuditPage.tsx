import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { useAuditLogs } from '@/context/AppContext';
import { AuditLog } from '@/types';
import { History, TrendingUp, FileText, Package, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const entityIcons = {
  contract: FileText,
  product: Package,
  client: Users,
  user: Users,
};

const actionLabels: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  price_change: 'Alteração de Preço',
  discount_change: 'Alteração de Desconto',
  status_change: 'Alteração de Status',
};

const actionColors: Record<string, string> = {
  create: 'badge-success',
  update: 'badge-info',
  delete: 'badge-destructive',
  price_change: 'badge-warning',
  discount_change: 'badge-warning',
  status_change: 'badge-info',
};

export default function AuditPage() {
  const { auditLogs } = useAuditLogs();

  const columns = [
    {
      key: 'action',
      header: 'Ação',
      render: (log: AuditLog) => (
        <span className={actionColors[log.action] || 'badge-info'}>
          {actionLabels[log.action] || log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entidade',
      render: (log: AuditLog) => {
        const Icon = entityIcons[log.entity_type] || FileText;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="capitalize">{log.entity_type}</span>
          </div>
        );
      },
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (log: AuditLog) => (
        <span className="text-foreground">{log.description}</span>
      ),
    },
    {
      key: 'user',
      header: 'Usuário',
      render: (log: AuditLog) => (
        <span className="text-muted-foreground">{log.user_name}</span>
      ),
    },
    {
      key: 'date',
      header: 'Data',
      render: (log: AuditLog) => (
        <span className="text-muted-foreground">
          {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader 
        title="Histórico de Auditoria"
        subtitle="Registro de todas as ações realizadas no sistema"
      />

      <div className="card-elevated">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <History className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Logs de Atividade</h2>
              <p className="text-sm text-muted-foreground">{auditLogs.length} registro(s) encontrado(s)</p>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={auditLogs}
          keyExtractor={(log) => log.id}
          emptyMessage="Nenhum registro de auditoria encontrado"
        />
      </div>
    </AppLayout>
  );
}
