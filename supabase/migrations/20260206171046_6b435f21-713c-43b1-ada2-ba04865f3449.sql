
-- Add cpf and phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create supervisor_assignments table
CREATE TABLE public.supervisor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supervisor_id, user_id)
);

-- Enable RLS
ALTER TABLE public.supervisor_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on supervisor_assignments
CREATE POLICY "Admins full access on supervisor_assignments"
  ON public.supervisor_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Supervisors can view their own assignments
CREATE POLICY "Supervisors can view their assignments"
  ON public.supervisor_assignments
  FOR SELECT
  TO authenticated
  USING (
    supervisor_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
