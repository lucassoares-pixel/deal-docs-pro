import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export interface SellerGoal {
  id: string;
  seller_id: string;
  month: number;
  year: number;
  goal_value: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useSellerGoals(month?: number, year?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: goals, isLoading, error } = useQuery({
    queryKey: ['seller_goals', month, year],
    queryFn: async () => {
      let query = supabase
        .from('seller_goals')
        .select('*');

      if (month !== undefined && year !== undefined) {
        query = query.eq('month', month).eq('year', year);
      }

      const { data, error } = await query.order('seller_id');

      if (error) throw error;
      return data as SellerGoal[];
    },
  });

  const upsertGoal = useMutation({
    mutationFn: async ({ seller_id, month, year, goal_value }: { 
      seller_id: string; 
      month: number; 
      year: number; 
      goal_value: number 
    }) => {
      const { data, error } = await supabase
        .from('seller_goals')
        .upsert(
          { 
            seller_id, 
            month, 
            year, 
            goal_value,
            created_by: user?.id,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'seller_id,month,year' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller_goals'] });
      toast({ title: 'Meta salva com sucesso' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao salvar meta', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('seller_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller_goals'] });
      toast({ title: 'Meta removida com sucesso' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao remover meta', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    goals,
    isLoading,
    error,
    upsertGoal,
    deleteGoal,
  };
}
