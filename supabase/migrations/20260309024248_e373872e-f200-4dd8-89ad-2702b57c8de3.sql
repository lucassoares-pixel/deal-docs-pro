-- Create commission_tiers table for configurable commission rates
CREATE TABLE public.commission_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_percentage numeric NOT NULL DEFAULT 0,
  max_percentage numeric NOT NULL DEFAULT 100,
  commission_rate numeric NOT NULL DEFAULT 0.5,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;

-- RLS policies - only admins can manage, all authenticated can view
CREATE POLICY "Admins can manage commission tiers"
ON public.commission_tiers
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "All authenticated users can view commission tiers"
ON public.commission_tiers
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Insert default tiers
INSERT INTO public.commission_tiers (min_percentage, max_percentage, commission_rate, label, sort_order, created_by)
VALUES 
  (0, 49, 0.5, '50%', 1, '00000000-0000-0000-0000-000000000000'),
  (50, 84, 0.6, '60%', 2, '00000000-0000-0000-0000-000000000000'),
  (85, 999, 0.7, '70%', 3, '00000000-0000-0000-0000-000000000000');