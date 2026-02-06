import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  cpf: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export interface SupervisorAssignment {
  id: string;
  supervisor_id: string;
  user_id: string;
  created_at: string;
}

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [supervisorAssignments, setSupervisorAssignments] = useState<SupervisorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchSupervisorAssignments();
    }
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setUsers((data as UserProfile[]) || []);
    }
    setLoading(false);
  };

  const fetchSupervisorAssignments = async () => {
    const { data, error } = await supabase
      .from('supervisor_assignments')
      .select('*');

    if (!error && data) {
      setSupervisorAssignments(data as SupervisorAssignment[]);
    }
  };

  const createUser = async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    cpf?: string;
    phone?: string;
  }) => {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'create', ...userData },
    });

    if (error) {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    if (data?.error) {
      toast({
        title: 'Erro ao criar usuário',
        description: data.error,
        variant: 'destructive',
      });
      return null;
    }

    await fetchUsers();
    toast({
      title: 'Usuário criado',
      description: 'Usuário criado com sucesso!',
    });
    return data;
  };

  const updateUser = async (userId: string, updates: {
    name?: string;
    role?: string;
    cpf?: string;
    phone?: string;
    active?: boolean;
  }) => {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update', user_id: userId, ...updates },
    });

    if (error) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    if (data?.error) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: data.error,
        variant: 'destructive',
      });
      return null;
    }

    await fetchUsers();
    toast({
      title: 'Usuário atualizado',
      description: 'Dados atualizados com sucesso!',
    });
    return data;
  };

  const resetPassword = async (userId: string, newPassword: string) => {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'reset_password', user_id: userId, new_password: newPassword },
    });

    if (error || data?.error) {
      toast({
        title: 'Erro ao redefinir senha',
        description: error?.message || data?.error,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Senha redefinida',
      description: 'Senha alterada com sucesso!',
    });
    return true;
  };

  const setSupervisorUsers = async (supervisorProfileId: string, userProfileIds: string[]) => {
    // Delete existing assignments for this supervisor
    await supabase
      .from('supervisor_assignments')
      .delete()
      .eq('supervisor_id', supervisorProfileId);

    // Insert new assignments
    if (userProfileIds.length > 0) {
      const assignments = userProfileIds.map(uid => ({
        supervisor_id: supervisorProfileId,
        user_id: uid,
      }));

      const { error } = await supabase
        .from('supervisor_assignments')
        .insert(assignments);

      if (error) {
        toast({
          title: 'Erro ao definir supervisão',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
    }

    await fetchSupervisorAssignments();
    toast({
      title: 'Supervisão atualizada',
      description: 'Usuários supervisionados atualizados!',
    });
    return true;
  };

  const getSupervisedUsers = (supervisorProfileId: string) => {
    return supervisorAssignments
      .filter(a => a.supervisor_id === supervisorProfileId)
      .map(a => a.user_id);
  };

  return {
    users,
    supervisorAssignments,
    loading,
    createUser,
    updateUser,
    resetPassword,
    setSupervisorUsers,
    getSupervisedUsers,
    refetch: fetchUsers,
  };
}
