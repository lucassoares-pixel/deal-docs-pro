
-- Allow users to delete their own discount_logs (needed for contract editing)
CREATE POLICY "Users can delete their discount logs"
  ON public.discount_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = discount_logs.contract_id
        AND (contracts.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Allow users to delete their own extra_discount_logs
CREATE POLICY "Users can delete their extra discount logs"
  ON public.extra_discount_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = extra_discount_logs.contract_id
        AND (contracts.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Allow users to update their own discount_logs
CREATE POLICY "Users can update their discount logs"
  ON public.discount_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = discount_logs.contract_id
        AND (contracts.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Allow users to update their own extra_discount_logs
CREATE POLICY "Users can update their extra discount logs"
  ON public.extra_discount_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = extra_discount_logs.contract_id
        AND (contracts.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );
