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

  const updateContract = async (
    id: string,
    contract: Partial<ContractInsert>,
    contractProducts: Omit<ContractProductInsert, 'contract_id'>[],
    discountLogs: Omit<DiscountLogInsert, 'contract_id'>[]
  ) => {
    if (!user) return null;

    // If contract was concluido, reset to pendente and remove commission (addendum = new amendment)
    const existingContract = contracts.find(c => c.id === id);
    const wasConcluido = (existingContract as any)?.sales_status === 'concluido';
    if (wasConcluido) {
      await supabase.from('sales_commissions').delete().eq('contract_id', id);
      (contract as any).sales_status = 'pendente';
    }

    // Update contract
    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .update(contract)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (contractError) {
      toast({
        title: 'Erro ao atualizar contrato',
        description: contractError.message,
        variant: 'destructive',
      });
      return null;
    }

    // Replace contract products
    await supabase.from('contract_products').delete().eq('contract_id', id);
    if (contractProducts.length > 0) {
      const productsWithContractId = contractProducts.map(p => ({
        ...p,
        contract_id: id,
      }));
      const { error: productsError } = await supabase
        .from('contract_products')
        .insert(productsWithContractId);
      if (productsError) console.error('Error updating contract products:', productsError);
    }

    // Replace discount logs
    await supabase.from('discount_logs').delete().eq('contract_id', id);
    if (discountLogs.length > 0) {
      const logsWithContractId = discountLogs.map(l => ({
        ...l,
        contract_id: id,
      }));
      const { error: logsError } = await supabase
        .from('discount_logs')
        .insert(logsWithContractId);
      if (logsError) console.error('Error updating discount logs:', logsError);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: profile?.name || user.email || 'Unknown',
      action: 'update',
      entity_type: 'contract',
      entity_id: id,
      new_value: { id },
      description: 'Contrato atualizado',
    });

    await fetchContracts();
    toast({
      title: 'Contrato atualizado',
      description: 'Contrato atualizado com sucesso!',
    });
    return contractData;
  };

  const updateContractStatus = async (id: string, status: string) => {
    // If cancelling a concluded sale, reset sales_status and remove commission
    const existingContract = contracts.find(c => c.id === id);
    const wasConcluido = (existingContract as any)?.sales_status === 'concluido';
    
    const updatePayload: Record<string, unknown> = { status };
    if (status === 'cancelled' && wasConcluido) {
      updatePayload.sales_status = 'pendente';
      await supabase.from('sales_commissions').delete().eq('contract_id', id);
    }

    const { data, error } = await supabase
      .from('contracts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

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

  const toggleSalesStatus = async (id: string, sales_status: 'pendente' | 'concluido') => {
    const contract = contracts.find(c => c.id === id);
    if (!contract || !user || !profile) return;

    const { error } = await supabase
      .from('contracts')
      .update({ sales_status } as any)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Se o status for concluído, gerar comissão
    if (sales_status === 'concluido') {
      const recurring_value = contract.recurring_total_discounted || 0;
      const setup_value = contract.setup_total || 0;
      
      // Lógica de comissão simplificada - adaptar conforme necessidade real
      let commission_percentage = 0;
      if (recurring_value > 0) {
          // Valores fictícios para exemplo. Ideal seria buscar a meta do usuário
          commission_percentage = 50; 
      }
      
      const commission_value = (recurring_value * commission_percentage) / 100;
      const setup_commission = (setup_value * 10) / 100; // 10% fixo sobre setup
      const total_commission = commission_value + setup_commission;

      const { error: commissionError } = await supabase
        .from('sales_commissions')
        .insert({
          contract_id: id,
          user_id: contract.user_id,
          user_name: profile.name || user.email || 'Vendedor',
          sale_date: new Date().toISOString().split('T')[0],
          recurring_value,
          setup_value,
          commission_percentage,
          commission_value,
          setup_commission,
          total_commission
        });

        if(commissionError) {
             console.error('Erro ao gerar comissão:', commissionError);
        }
    } else {
        // Se voltou para pendente, remover a comissão gerada
        await supabase
        .from('sales_commissions')
        .delete()
        .eq('contract_id', id);
    }

    await fetchContracts();
    toast({
      title: sales_status === 'concluido' ? 'Venda Concluída' : 'Status alterado para pendente',
      description: sales_status === 'concluido' ? 'Comissão gerada com sucesso.' : 'Comissão removida.',
    });
  };

  const getContractById = (id: string) => contracts.find(c => c.id === id);

  const getContractsByClientId = (clientId: string) => 
    contracts.filter(c => c.client_id === clientId);

  return {
    contracts,
    loading,
    addContract,
    updateContract,
    updateContractStatus,
    deleteContract,
    toggleSalesStatus,
    getContractById,
    getContractsByClientId,
    refetch: fetchContracts,
  };
}
