
ALTER TABLE public.clients
ADD COLUMN issues_invoice boolean NOT NULL DEFAULT false,
ADD COLUMN tax_regime text NULL;
