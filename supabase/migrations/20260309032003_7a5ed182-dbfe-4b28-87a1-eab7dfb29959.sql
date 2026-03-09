
ALTER TABLE public.direct_sales ADD COLUMN cost_value numeric DEFAULT NULL;

-- Allow admins to update direct sales (to set cost)
CREATE POLICY "Admins can update direct sales"
ON public.direct_sales FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
