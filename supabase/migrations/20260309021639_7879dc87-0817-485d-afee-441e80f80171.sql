-- Drop existing delete policy
DROP POLICY IF EXISTS "Admins can delete commission records" ON public.sales_commissions;

-- Create new policy that allows users to delete commissions for their own contracts
CREATE POLICY "Users can delete commission records for own contracts"
ON public.sales_commissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.id = sales_commissions.contract_id
    AND contracts.user_id = auth.uid()
  )
  OR is_admin(auth.uid())
);