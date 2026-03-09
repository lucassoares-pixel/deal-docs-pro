import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export interface DirectSale {
  id: string;
  user_id: string;
  seller_id: string | null;
  company_name: string;
  sale_date: string;
  recurring_value: number;
  setup_value: number;
  prize_base: number;
  prize_value: number;
  sale_type: string;
  cost_value: number | null;
  created_at: string;
}

export function useDirectSales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: directSales, isLoading } = useQuery({
    queryKey: ['direct_sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_sales')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DirectSale[];
    },
  });

  const createDirectSale = useMutation({
    mutationFn: async (sale: {
      company_name: string;
      sale_date: string;
      recurring_value: number;
      setup_value: number;
      seller_id: string;
    }) => {
      const prizeBase = sale.recurring_value + sale.setup_value;
      const prizeValue = prizeBase * 0.10;

      const { data, error } = await supabase
        .from('direct_sales')
        .insert({
          user_id: user?.id,
          company_name: sale.company_name,
          sale_date: sale.sale_date,
          recurring_value: sale.recurring_value,
          setup_value: sale.setup_value,
          prize_base: prizeBase,
          prize_value: prizeValue,
          sale_type: 'sem_contrato',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct_sales'] });
      toast({ title: 'Venda registrada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar venda', description: error.message, variant: 'destructive' });
    },
  });

  const updateCost = useMutation({
    mutationFn: async ({ id, cost_value }: { id: string; cost_value: number }) => {
      const { data, error } = await supabase
        .from('direct_sales')
        .update({ cost_value })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct_sales'] });
      toast({ title: 'Custo atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar custo', description: error.message, variant: 'destructive' });
    },
  });

  return { directSales, isLoading, createDirectSale, updateCost };
}
