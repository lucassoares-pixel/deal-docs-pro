import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export interface BonusPrize {
  id: string;
  seller_id: string;
  description: string;
  value: number;
  month: number;
  year: number;
  created_at: string;
  created_by: string;
}

export function useBonusPrizes(month?: number, year?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['bonus_prizes', month, year],
    queryFn: async () => {
      let query = supabase.from('bonus_prizes').select('*');
      if (month !== undefined && year !== undefined) {
        query = query.eq('month', month).eq('year', year);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as BonusPrize[];
    },
  });

  const createBonus = useMutation({
    mutationFn: async (bonus: { seller_id: string; description: string; value: number; month: number; year: number }) => {
      const { data, error } = await supabase
        .from('bonus_prizes')
        .insert({ ...bonus, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus_prizes'] });
      toast({ title: 'Bônus adicionado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar bônus', description: error.message, variant: 'destructive' });
    },
  });

  const deleteBonus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bonus_prizes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus_prizes'] });
      toast({ title: 'Bônus removido com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover bônus', description: error.message, variant: 'destructive' });
    },
  });

  return { bonuses, isLoading, createBonus, deleteBonus };
}
