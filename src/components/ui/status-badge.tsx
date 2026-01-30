import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'draft' | 'cancelled' | 'expired' | 'success' | 'warning' | 'error';
  label?: string;
  className?: string;
}

const statusConfig = {
  active: { class: 'badge-success', label: 'Ativo' },
  inactive: { class: 'badge-destructive', label: 'Inativo' },
  pending: { class: 'badge-warning', label: 'Pendente' },
  draft: { class: 'badge-info', label: 'Rascunho' },
  cancelled: { class: 'badge-destructive', label: 'Cancelado' },
  expired: { class: 'badge-destructive', label: 'Expirado' },
  success: { class: 'badge-success', label: 'Sucesso' },
  warning: { class: 'badge-warning', label: 'Atenção' },
  error: { class: 'badge-destructive', label: 'Erro' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(config.class, className)}>
      {label || config.label}
    </span>
  );
}
