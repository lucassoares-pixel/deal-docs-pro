import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Client = Tables<'clients'>;
type LegalRepresentative = Tables<'legal_representatives'>;
type ClientInsert = TablesInsert<'clients'>;
type LegalRepresentativeInsert = TablesInsert<'legal_representatives'>;

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [legalRepresentatives, setLegalRepresentatives] = useState<LegalRepresentative[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchLegalRepresentatives();
    }
  }, [user]);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const fetchLegalRepresentatives = async () => {
    const { data, error } = await supabase
      .from('legal_representatives')
      .select('*');

    if (!error) {
      setLegalRepresentatives(data || []);
    }
  };

  const addClient = async (client: Omit<ClientInsert, 'user_id'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao criar cliente',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    setClients([data, ...clients]);
    return data;
  };

  const addLegalRepresentative = async (legalRep: Omit<LegalRepresentativeInsert, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('legal_representatives')
      .insert(legalRep)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao criar representante legal',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    setLegalRepresentatives([...legalRepresentatives, data]);
    return data;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    setClients(clients.map(c => c.id === id ? data : c));
    return data;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir cliente',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setClients(clients.filter(c => c.id !== id));
    return true;
  };

  const getClientById = (id: string) => clients.find(c => c.id === id);

  const getLegalRepByClientId = (clientId: string) => 
    legalRepresentatives.find(lr => lr.client_id === clientId);

  return {
    clients,
    legalRepresentatives,
    loading,
    addClient,
    addLegalRepresentative,
    updateClient,
    deleteClient,
    getClientById,
    getLegalRepByClientId,
    refetch: fetchClients,
  };
}
