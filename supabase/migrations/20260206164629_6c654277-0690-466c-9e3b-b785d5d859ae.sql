
-- Add SKU, product_type, and cost_price columns to products table
ALTER TABLE public.products
  ADD COLUMN sku text,
  ADD COLUMN product_type text NOT NULL DEFAULT 'primary',
  ADD COLUMN cost_price numeric DEFAULT NULL;

-- Add index on SKU for fast lookups
CREATE INDEX idx_products_sku ON public.products(sku);
