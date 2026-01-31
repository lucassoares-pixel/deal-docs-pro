import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Product = Tables<'products'>;
type ProductInsert = TablesInsert<'products'>;

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar produtos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const addProduct = async (product: Omit<ProductInsert, 'user_id'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao criar produto',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    setProducts([data, ...products]);
    toast({
      title: 'Produto criado',
      description: 'Produto criado com sucesso!',
    });
    return data;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    setProducts(products.map(p => p.id === id ? data : p));
    return data;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir produto',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setProducts(products.filter(p => p.id !== id));
    return true;
  };

  const getProductById = (id: string) => products.find(p => p.id === id);

  const activeProducts = products.filter(p => p.active);

  return {
    products,
    activeProducts,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    refetch: fetchProducts,
  };
}
