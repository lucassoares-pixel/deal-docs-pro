-- Add anchor product and auto discount fields to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_anchor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_auto_discount boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_discount_percentage numeric NOT NULL DEFAULT 0;