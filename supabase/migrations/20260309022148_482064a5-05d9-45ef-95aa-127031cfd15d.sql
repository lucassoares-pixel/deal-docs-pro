-- Allow admins to update any contract (needed for reverting sales status)
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;

CREATE POLICY "Users can update their own contracts"
ON public.contracts
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));