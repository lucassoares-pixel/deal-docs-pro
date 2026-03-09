import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export interface CommissionTier {
  id: string;
  min_percentage: number;
  max_percentage: number;
  commission_rate: number;
  setup_prize_rate: number;
  label: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useCommissionTiers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tiers, isLoading, error } = useQuery({
    queryKey: ['commission_tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .select('*')
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      return data as CommissionTier[];
    },
  });

  const updateTier = useMutation({
    mutationFn: async (tier: Partial<CommissionTier> & { id: string }) => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .update({
          ...tier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tier.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission_tiers'] });
      toast({ title: 'Faixa atualizada com sucesso' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar faixa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createTier = useMutation({
    mutationFn: async (tier: Omit<CommissionTier, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .insert({
          ...tier,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission_tiers'] });
      toast({ title: 'Faixa criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar faixa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_tiers')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission_tiers'] });
      toast({ title: 'Faixa removida com sucesso' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover faixa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper function to get prize tier based on achievement percentage
  const getCommissionTier = (percentage: number) => {
    if (!tiers || tiers.length === 0) {
      return { rate: 0.5, setupRate: 0.1, label: '50%' };
    }
    const tier = tiers.find(
      (t) => percentage >= t.min_percentage && percentage <= t.max_percentage
    );
    return tier
      ? { rate: tier.commission_rate, setupRate: tier.setup_prize_rate, label: tier.label }
      : { rate: tiers[0].commission_rate, setupRate: tiers[0].setup_prize_rate, label: tiers[0].label };
  };

  return {
    tiers,
    isLoading,
    error,
    updateTier,
    createTier,
    deleteTier,
    getCommissionTier,
  };
}
