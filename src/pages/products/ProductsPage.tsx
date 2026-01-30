import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProducts } from '@/context/AppContext';
import { Product } from '@/types';
import { Package, Plus, Search, DollarSign, Percent, Calendar } from 'lucide-react';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { products } = useProducts();
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
            <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
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
          <span className="font-medium text-foreground">{formatCurrency(product.base_price)}</span>
          {product.billing_type === 'recurring' && (
            <span className="text-sm text-muted-foreground">/mês</span>
          )}
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Desconto Máx.',
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-muted-foreground" />
          <span className={product.allow_discount ? 'text-foreground' : 'text-muted-foreground'}>
            {product.allow_discount ? `${product.max_discount_percentage}%` : 'Não permitido'}
          </span>
        </div>
      ),
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
    {
      key: 'status',
      header: 'Status',
      render: (product: Product) => (
        <StatusBadge status={product.active ? 'active' : 'inactive'} />
      ),
    },
  ];

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
