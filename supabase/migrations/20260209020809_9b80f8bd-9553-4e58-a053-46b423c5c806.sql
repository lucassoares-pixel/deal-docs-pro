
-- 1. Tornar produtos visíveis para todos os usuários autenticados
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
CREATE POLICY "All authenticated users can view products"
  ON public.products
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Adicionar campo company_type (Matriz/Filial) na tabela clients
ALTER TABLE public.clients
ADD COLUMN company_type text NOT NULL DEFAULT 'matriz';
