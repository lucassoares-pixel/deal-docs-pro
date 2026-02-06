import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/context/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { Package, Plus, Search, DollarSign, Percent, Calendar, Loader2, Tag } from 'lucide-react';

type Product = Tables<'products'>;

export default function ProductsPage() {
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [search, setSearch] = useState('');

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.description.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const columns = [
    {
      key: 'product',
      header: 'Produto',
      render: (product: Product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">{product.name}</p>
            <div className="flex items-center gap-2">
              {(product as any).sku && (
                <span className="text-xs text-muted-foreground font-mono">{(product as any).sku}</span>
              )}
              <span className={(product as any).product_type === 'primary' ? 'badge-info text-xs' : 'badge-warning text-xs'}>
                {(product as any).product_type === 'primary' ? 'Principal' : 'Secundário'}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'billing',
      header: 'Cobrança',
      render: (product: Product) => (
        <span className={product.billing_type === 'recurring' ? 'badge-info' : 'badge-warning'}>
          {product.billing_type === 'recurring' ? 'Recorrente' : 'Único'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Preço Base',
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{formatCurrency(Number(product.base_price))}</span>
          {product.billing_type === 'recurring' && (
            <span className="text-sm text-muted-foreground">/mês</span>
          )}
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Desconto',
      render: (product: Product) => {
        const discountPeriodType = (product as any).discount_period_type;
        const discountEndDate = (product as any).discount_end_date;
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <span className={product.allow_discount ? 'text-foreground' : 'text-muted-foreground'}>
                {product.allow_discount ? `Até ${product.max_discount_percentage}%` : 'Não permitido'}
              </span>
            </div>
            {product.allow_discount && (
              <span className="text-xs text-muted-foreground">
                {discountPeriodType === 'fixed_period' && discountEndDate
                  ? `Até ${new Date(discountEndDate).toLocaleDateString('pt-BR')}`
                  : 'Indeterminado'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'fidelity',
      header: 'Fidelidade',
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {product.fidelity_months > 0 ? `${product.fidelity_months} meses` : '-'}
          </span>
        </div>
      ),
    },
    ...(isAdmin ? [{
      key: 'cost',
      header: 'Custo',
      render: (product: Product) => (
        <span className="text-muted-foreground">
          {(product as any).cost_price ? formatCurrency(Number((product as any).cost_price)) : '-'}
        </span>
      ),
    }] : []),
    {
      key: 'status',
      header: 'Status',
      render: (product: Product) => (
        <StatusBadge status={product.active ? 'active' : 'inactive'} />
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

  if (products.length === 0) {
    return (
      <AppLayout>
        <PageHeader 
          title="Produtos"
          subtitle="Gerencie seu catálogo de produtos e serviços"
        />
        <div className="card-elevated">
          <EmptyState
            icon={<Package className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum produto cadastrado"
            description="Adicione produtos ao catálogo para começar a criar contratos."
            action={
              <Button onClick={() => navigate('/products/new')} className="btn-secondary">
                <Plus className="w-4 h-4" />
                Novo Produto
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
        title="Produtos"
        subtitle={`${products.length} produto(s) no catálogo`}
        actions={
          <Button onClick={() => navigate('/products/new')} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        }
      />

      <div className="card-elevated">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredProducts}
          keyExtractor={(product) => product.id}
          onRowClick={(product) => navigate(`/products/${product.id}`)}
          emptyMessage="Nenhum produto encontrado com os filtros aplicados"
        />
      </div>
    </AppLayout>
  );
}
