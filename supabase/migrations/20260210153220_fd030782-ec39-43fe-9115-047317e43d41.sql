
-- Add state_registration to clients
ALTER TABLE public.clients ADD COLUMN state_registration text;

-- Add training/implementation fields to contracts
ALTER TABLE public.contracts ADD COLUMN training_contact_name text;
ALTER TABLE public.contracts ADD COLUMN training_contact_phone text;
ALTER TABLE public.contracts ADD COLUMN implementation_type text DEFAULT 'remota';
ALTER TABLE public.contracts ADD COLUMN certificate_type text;
