import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ProductForm, ProductFormData } from '@/components/products/ProductForm';
import { useProducts } from '@/hooks/useProducts';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProductPage() {
  const navigate = useNavigate();
  const { addProduct } = useProducts();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: ProductFormData) => {
    setIsSubmitting(true);

    try {
      const result = await addProduct({
        name: formData.name,
        description: formData.description,
        billing_type: formData.billing_type,
        recurring_period: formData.billing_type === 'recurring' ? 'monthly' : null,
        base_price: parseFloat(formData.base_price),
        setup_price: formData.setup_price ? parseFloat(formData.setup_price) : null,
        allow_discount: formData.allow_discount,
        max_discount_percentage: formData.allow_discount ? parseFloat(formData.max_discount_percentage) : 0,
        discount_period_type: formData.discount_period_type,
        discount_start_date: formData.discount_period_type === 'fixed_period' ? formData.discount_start_date : null,
        discount_end_date: formData.discount_period_type === 'fixed_period' ? formData.discount_end_date : null,
        fidelity_months: parseInt(formData.fidelity_months) || 0,
        active: formData.active,
      });

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
      />
    </AppLayout>
  );
}
