
-- Fix: Allow admins to update and delete any product
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products or admin updates all"
ON public.products FOR UPDATE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products or admin deletes all"
ON public.products FOR DELETE
USING (auth.uid() = user_id OR is_admin(auth.uid()));
