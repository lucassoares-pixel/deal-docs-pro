import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Contract = Tables<'contracts'>;
type ContractProduct = Tables<'contract_products'>;
type DiscountLog = Tables<'discount_logs'>;
type ContractInsert = TablesInsert<'contracts'>;
type ContractProductInsert = TablesInsert<'contract_products'>;
type DiscountLogInsert = TablesInsert<'discount_logs'>;

export interface ContractWithDetails extends Contract {
  client?: Tables<'clients'>;
  legal_representative?: Tables<'legal_representatives'> | null;
  products?: (ContractProduct & { product?: Tables<'products'> })[];
  discount_logs?: DiscountLog[];
}

export function useContracts() {
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        client:clients(*),
        legal_representative:legal_representatives(*),
        products:contract_products(*, product:products(*)),
        discount_logs(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar contratos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setContracts(data || []);
    }
    setLoading(false);
  };

  const addContract = async (
    contract: Omit<ContractInsert, 'user_id'>,
    contractProducts: Omit<ContractProductInsert, 'contract_id'>[],
    discountLogs: Omit<DiscountLogInsert, 'contract_id'>[]
  ) => {
    if (!user) return null;

    // Insert contract
    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .insert({ ...contract, user_id: user.id })
      .select()
      .single();

    if (contractError) {
      toast({
        title: 'Erro ao criar contrato',
        description: contractError.message,
        variant: 'destructive',
      });
      return null;
    }

    // Insert contract products
    if (contractProducts.length > 0) {
      const productsWithContractId = contractProducts.map(p => ({
        ...p,
        contract_id: contractData.id,
      }));

      const { error: productsError } = await supabase
        .from('contract_products')
        .insert(productsWithContractId);

      if (productsError) {
        console.error('Error inserting contract products:', productsError);
      }
    }

    // Insert discount logs
    if (discountLogs.length > 0) {
      const logsWithContractId = discountLogs.map(l => ({
        ...l,
        contract_id: contractData.id,
      }));

      const { error: logsError } = await supabase
        .from('discount_logs')
        .insert(logsWithContractId);

      if (logsError) {
        console.error('Error inserting discount logs:', logsError);
      }
    }

    // Add audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: profile?.name || user.email || 'Unknown',
      action: 'create',
      entity_type: 'contract',
      entity_id: contractData.id,
      new_value: { id: contractData.id },
      description: `Contrato criado`,
    });

    await fetchContracts();
    toast({
      title: 'Contrato criado',
      description: 'Contrato criado com sucesso!',
    });
    return contractData;
  };

  const updateContractStatus = async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('contracts')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_name: profile?.name || user.email || 'Unknown',
        action: status === 'cancelled' ? 'cancel' : 'update',
        entity_type: 'contract',
        entity_id: id,
        new_value: { status },
        description: status === 'cancelled' ? 'Contrato cancelado' : `Status do contrato alterado para ${status}`,
      });
    }

    await fetchContracts();
    return data;
  };

  const deleteContract = async (id: string) => {
    // Delete related records first
    await supabase.from('discount_logs').delete().eq('contract_id', id);
    await supabase.from('extra_discount_logs').delete().eq('contract_id', id);
    await supabase.from('contract_products').delete().eq('contract_id', id);

    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir contrato',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_name: profile?.name || user.email || 'Unknown',
        action: 'delete',
        entity_type: 'contract',
        entity_id: id,
        new_value: null,
        description: 'Contrato excluído',
      });
    }

    await fetchContracts();
    toast({
      title: 'Contrato excluído',
      description: 'O contrato foi removido com sucesso.',
    });
    return true;
  };

  const toggleSigned = async (id: string, signed: boolean) => {
    const { error } = await supabase
      .from('contracts')
      .update({ signed } as any)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao atualizar assinatura',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    await fetchContracts();
    toast({
      title: signed ? 'Contrato assinado' : 'Assinatura removida',
      description: signed ? 'Receita confirmada com contrato assinado.' : 'Marcação de assinatura removida.',
    });
  };

  const getContractById = (id: string) => contracts.find(c => c.id === id);

  const getContractsByClientId = (clientId: string) => 
    contracts.filter(c => c.client_id === clientId);

  return {
    contracts,
    loading,
    addContract,
    updateContractStatus,
    deleteContract,
    toggleSigned,
    getContractById,
    getContractsByClientId,
    refetch: fetchContracts,
  };
}
