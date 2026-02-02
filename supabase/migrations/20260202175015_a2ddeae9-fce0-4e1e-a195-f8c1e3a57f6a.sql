-- Add discount period fields to products table
ALTER TABLE public.products 
ADD COLUMN discount_period_type text NOT NULL DEFAULT 'indeterminate',
ADD COLUMN discount_start_date date,
ADD COLUMN discount_end_date date;

-- Add check constraint for discount_period_type
ALTER TABLE public.products 
ADD CONSTRAINT products_discount_period_type_check 
CHECK (discount_period_type IN ('indeterminate', 'fixed_period'));