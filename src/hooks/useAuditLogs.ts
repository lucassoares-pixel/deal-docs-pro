import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type AuditLog = Tables<'audit_logs'>;

export function useAuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAuditLogs();
    }
  }, [user]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar logs',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setAuditLogs(data || []);
    }
    setLoading(false);
  };

  const addAuditLog = async (log: Omit<AuditLog, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(log)
      .select()
      .single();

    if (error) {
      console.error('Error adding audit log:', error);
      return null;
    }

    setAuditLogs([data, ...auditLogs]);
    return data;
  };

  return {
    auditLogs,
    loading,
    addAuditLog,
    refetch: fetchAuditLogs,
  };
}
