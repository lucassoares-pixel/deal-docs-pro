
-- Helper function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- CLIENTS: Allow all authenticated users to view all clients
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "All authenticated users can view clients"
  ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- LEGAL REPRESENTATIVES: Allow all authenticated users to view (follows clients visibility)
DROP POLICY IF EXISTS "Users can view legal reps of their clients" ON public.legal_representatives;
CREATE POLICY "All authenticated users can view legal representatives"
  ON public.legal_representatives FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- CONTRACTS: Admin can view all, users see their own
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
CREATE POLICY "Users can view own contracts or admin sees all"
  ON public.contracts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- CONTRACT_PRODUCTS: Follow contract visibility
DROP POLICY IF EXISTS "Users can view their contract products" ON public.contract_products;
CREATE POLICY "Users can view contract products"
  ON public.contract_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_products.contract_id
        AND (contracts.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- DISCOUNT_LOGS: Follow contract visibility
DROP POLICY IF EXISTS "Users can view their discount logs" ON public.discount_logs;
CREATE POLICY "Users can view discount logs"
  ON public.discount_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = discount_logs.contract_id
        AND (contracts.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- EXTRA_DISCOUNT_LOGS: Follow contract visibility
DROP POLICY IF EXISTS "Users can view their extra discount logs" ON public.extra_discount_logs;
CREATE POLICY "Users can view extra discount logs"
  ON public.extra_discount_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = extra_discount_logs.contract_id
        AND (contracts.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- AUDIT_LOGS: Admin can view all
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs or admin sees all"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
