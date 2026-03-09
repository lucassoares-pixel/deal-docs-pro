-- Create bonus_prizes table for campaign-based bonus prizes
CREATE TABLE public.bonus_prizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.bonus_prizes ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage bonus prizes"
ON public.bonus_prizes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Sellers can view their own
CREATE POLICY "Sellers can view own bonus prizes"
ON public.bonus_prizes
FOR SELECT
TO authenticated
USING (seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));