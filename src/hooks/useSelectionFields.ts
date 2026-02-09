import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type FieldType = 'brand' | 'category' | 'product_group';

export interface SelectionField {
  id: string;
  field_type: string;
  value: string;
  active: boolean;
  created_at: string;
  user_id: string;
}

export function useSelectionFields(fieldType?: FieldType) {
  const [fields, setFields] = useState<SelectionField[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchFields();
  }, [user, fieldType]);

  const fetchFields = async () => {
    setLoading(true);
    let query = supabase
      .from('selection_fields')
      .select('*')
      .order('value', { ascending: true });

    if (fieldType) {
      query = query.eq('field_type', fieldType);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Erro ao carregar campos', description: error.message, variant: 'destructive' });
    } else {
      setFields(data || []);
    }
    setLoading(false);
  };

  const addField = async (field_type: FieldType, value: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('selection_fields')
      .insert({ field_type, value: value.trim(), user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar campo', description: error.message, variant: 'destructive' });
      return null;
    }

    setFields(prev => [...prev, data].sort((a, b) => a.value.localeCompare(b.value)));
    toast({ title: 'Campo criado com sucesso!' });
    return data;
  };

  const updateField = async (id: string, updates: Partial<SelectionField>) => {
    const { data, error } = await supabase
      .from('selection_fields')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return null;
    }

    setFields(prev => prev.map(f => f.id === id ? data : f));
    return data;
  };

  const deleteField = async (id: string) => {
    const { error } = await supabase.from('selection_fields').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return false;
    }
    setFields(prev => prev.filter(f => f.id !== id));
    return true;
  };

  const getByType = (type: FieldType) => fields.filter(f => f.field_type === type && f.active);

  return { fields, loading, addField, updateField, deleteField, getByType, refetch: fetchFields };
}
