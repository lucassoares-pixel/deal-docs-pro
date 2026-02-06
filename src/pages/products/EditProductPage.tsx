import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ProductForm, ProductFormData } from '@/components/products/ProductForm';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditProductPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { products, loading: productsLoading, updateProduct, getProductById } = useProducts();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<ProductFormData | null>(null);

  useEffect(() => {
    if (!productsLoading && id) {
      const product = getProductById(id);
      if (product) {
        setInitialData({
          name: product.name,
          sku: (product as any).sku || '',
          description: product.description,
          billing_type: product.billing_type as 'recurring' | 'one_time',
          product_type: ((product as any).product_type as 'primary' | 'secondary') || 'primary',
          base_price: product.base_price.toString(),
          setup_price: product.setup_price?.toString() || '',
          cost_price: (product as any).cost_price?.toString() || '',
          allow_discount: product.allow_discount,
          max_discount_percentage: product.max_discount_percentage.toString(),
          fidelity_months: product.fidelity_months.toString(),
          active: product.active,
        });
        setIsLoading(false);
      } else if (products.length > 0) {
        toast.error('Produto não encontrado');
        navigate('/products');
      }
    }
  }, [id, products, productsLoading, getProductById, navigate]);

  const handleSubmit = async (formData: ProductFormData) => {
    if (!id) return;
    
    setIsSubmitting(true);

    try {
      const result = await updateProduct(id, {
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description,
        billing_type: formData.billing_type,
        product_type: formData.product_type,
        recurring_period: formData.billing_type === 'recurring' ? 'monthly' : null,
        base_price: parseFloat(formData.base_price),
        setup_price: formData.setup_price ? parseFloat(formData.setup_price) : null,
        cost_price: isAdmin && formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        allow_discount: formData.allow_discount,
        max_discount_percentage: formData.allow_discount ? parseFloat(formData.max_discount_percentage) : 0,
        fidelity_months: parseInt(formData.fidelity_months) || 0,
        active: formData.active,
      } as any);

      if (result) {
        toast.success('Produto atualizado com sucesso!');
        navigate('/products');
      }
    } catch (error) {
      toast.error('Erro ao atualizar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (productsLoading || isLoading) {
    return (
      <AppLayout>
        <PageHeader 
          title="Editar Produto"
          subtitle="Carregando dados do produto..."
          actions={
            <Button variant="outline" onClick={() => navigate('/products')}>
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          }
        />
        <div className="space-y-6">
          <div className="card-elevated p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Editar Produto"
        subtitle="Atualize as informações do produto"
        actions={
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        }
      />

      {initialData && (
        <ProductForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/products')}
          isSubmitting={isSubmitting}
          submitLabel="Salvar Alterações"
          isAdmin={isAdmin}
        />
      )}
    </AppLayout>
  );
}
