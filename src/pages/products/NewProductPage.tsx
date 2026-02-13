import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ProductForm, ProductFormData } from '@/components/products/ProductForm';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProductPage() {
  const navigate = useNavigate();
  const { addProduct } = useProducts();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: ProductFormData) => {
    setIsSubmitting(true);

    try {
      const result = await addProduct({
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description,
        category: formData.category || null,
        product_group: formData.product_group || null,
        brand: formData.brand || null,
        billing_type: formData.billing_type,
        product_type: formData.product_type,
        recurring_period: formData.billing_type === 'recurring' ? 'monthly' : null,
        base_price: parseFloat(formData.base_price),
        setup_price: formData.setup_price ? parseFloat(formData.setup_price) : 0,
        cost_price: isAdmin && formData.cost_price ? parseFloat(formData.cost_price) : null,
        cas_price: isAdmin && formData.cas_price ? parseFloat(formData.cas_price) : null,
        allow_discount: formData.allow_discount,
        max_discount_percentage: formData.allow_discount ? parseFloat(formData.max_discount_percentage) : 0,
        fidelity_months: parseInt(formData.fidelity_months) || 0,
        active: formData.active,
        is_anchor: formData.is_anchor,
        has_auto_discount: formData.has_auto_discount,
        auto_discount_percentage: formData.has_auto_discount ? parseFloat(formData.auto_discount_percentage) : 0,
      } as any);

      if (result) {
        navigate('/products');
      }
    } catch (error) {
      toast.error('Erro ao cadastrar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Novo Produto"
        subtitle="Adicione um novo produto ao catálogo"
        actions={
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        }
      />

      <ProductForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/products')}
        isSubmitting={isSubmitting}
        submitLabel="Salvar Produto"
        isAdmin={isAdmin}
      />
    </AppLayout>
  );
}
