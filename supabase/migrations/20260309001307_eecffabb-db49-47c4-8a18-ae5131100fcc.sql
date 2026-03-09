-- Corrigir política de segurança para sales_commissions
-- Remover política permissiva atual
DROP POLICY "System can create commission records" ON public.sales_commissions;

-- Criar política mais restritiva para criação de comissões
-- Permite que usuários criem comissões apenas para seus próprios contratos
CREATE POLICY "Users can create commission records for own contracts"
ON public.sales_commissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contracts 
    WHERE contracts.id = contract_id 
    AND contracts.user_id = auth.uid()
  )
);