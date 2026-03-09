-- Add setup prize rate column to commission_tiers
ALTER TABLE public.commission_tiers ADD COLUMN setup_prize_rate numeric NOT NULL DEFAULT 0.1;

-- Update default tiers with 10% setup prize
UPDATE public.commission_tiers SET setup_prize_rate = 0.1;