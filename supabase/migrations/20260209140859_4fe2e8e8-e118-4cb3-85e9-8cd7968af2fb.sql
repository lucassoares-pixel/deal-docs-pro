
-- PROFILES: Admin can view all profiles, users see only their own
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view own profile or admin sees all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- PROFILES: Admin can update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or admin updates all"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
