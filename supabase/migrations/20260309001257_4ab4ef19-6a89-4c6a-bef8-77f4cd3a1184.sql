-- Adicionar campo sales_status para substituir signed
ALTER TABLE contracts ADD COLUMN sales_status text DEFAULT 'pendente';

-- Migrar dados existentes: se signed = true, então sales_status = 'concluido', senão 'pendente'
UPDATE contracts SET sales_status = CASE 
  WHEN signed = true THEN 'concluido'
  ELSE 'pendente'
END;

-- Criar tabela para registrar comissões/vendas fechadas
CREATE TABLE public.sales_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  sale_date date NOT NULL,
  recurring_value numeric NOT NULL,
  setup_value numeric NOT NULL DEFAULT 0,
  commission_percentage numeric NOT NULL,
  commission_value numeric NOT NULL,
  setup_commission numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;

-- Policies para sales_commissions
CREATE POLICY "Users can view own commissions or admin sees all"
ON public.sales_commissions
FOR SELECT
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "System can create commission records"
ON public.sales_commissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update commission records"
ON public.sales_commissions
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete commission records"
ON public.sales_commissions
FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sales_commissions_updated_at
  BEFORE UPDATE ON public.sales_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();