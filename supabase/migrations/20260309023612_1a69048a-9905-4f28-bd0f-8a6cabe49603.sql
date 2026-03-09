-- Create seller_goals table for monthly targets
CREATE TABLE public.seller_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
  goal_value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE (seller_id, month, year)
);

-- Enable RLS
ALTER TABLE public.seller_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage seller goals"
ON public.seller_goals
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Sellers can view their own goals"
ON public.seller_goals
FOR SELECT
TO authenticated
USING (seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));