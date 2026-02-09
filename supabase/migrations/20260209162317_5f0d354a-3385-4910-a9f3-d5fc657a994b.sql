
-- Create a table for reusable selection fields (brands, categories, product groups, etc.)
CREATE TABLE public.selection_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_type TEXT NOT NULL, -- 'brand', 'category', 'product_group'
  value TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Unique constraint to prevent duplicates per field_type
ALTER TABLE public.selection_fields ADD CONSTRAINT unique_field_type_value UNIQUE (field_type, value);

-- Enable RLS
ALTER TABLE public.selection_fields ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view selection fields
CREATE POLICY "All authenticated users can view selection fields"
ON public.selection_fields FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can create selection fields
CREATE POLICY "Admins can create selection fields"
ON public.selection_fields FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Only admins can update selection fields
CREATE POLICY "Admins can update selection fields"
ON public.selection_fields FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Only admins can delete selection fields
CREATE POLICY "Admins can delete selection fields"
ON public.selection_fields FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
