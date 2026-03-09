
CREATE TABLE public.direct_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  recurring_value numeric NOT NULL DEFAULT 0,
  setup_value numeric NOT NULL DEFAULT 0,
  prize_base numeric NOT NULL DEFAULT 0,
  prize_value numeric NOT NULL DEFAULT 0,
  sale_type text NOT NULL DEFAULT 'sem_contrato',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own direct sales"
ON public.direct_sales FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own direct sales or admin sees all"
ON public.direct_sales FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can delete own direct sales or admin"
ON public.direct_sales FOR DELETE TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));
