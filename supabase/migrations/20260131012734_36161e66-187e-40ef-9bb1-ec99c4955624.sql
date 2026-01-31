-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  company_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_number TEXT NOT NULL,
  address_neighborhood TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  address_zip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal_representatives table
CREATE TABLE public.legal_representatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  legal_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('recurring', 'one_time')),
  recurring_period TEXT CHECK (recurring_period IN ('monthly') OR recurring_period IS NULL),
  base_price DECIMAL(10,2) NOT NULL,
  setup_price DECIMAL(10,2),
  allow_discount BOOLEAN NOT NULL DEFAULT true,
  max_discount_percentage INTEGER NOT NULL DEFAULT 0,
  fidelity_months INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  legal_representative_id UUID REFERENCES public.legal_representatives(id),
  recurring_total_full DECIMAL(10,2) NOT NULL DEFAULT 0,
  recurring_total_discounted DECIMAL(10,2) NOT NULL DEFAULT 0,
  setup_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  billing_day INTEGER NOT NULL DEFAULT 1,
  fidelity_months INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contract_products junction table
CREATE TABLE public.contract_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  discounted_price DECIMAL(10,2) NOT NULL,
  full_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount_logs table for audit
CREATE TABLE public.discount_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_name TEXT NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_by TEXT NOT NULL
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'price_change', 'discount_change', 'status_change')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'contract', 'client', 'user')),
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for legal_representatives (via client ownership)
CREATE POLICY "Users can view legal reps of their clients" ON public.legal_representatives FOR SELECT USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = legal_representatives.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can create legal reps for their clients" ON public.legal_representatives FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = legal_representatives.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can update legal reps of their clients" ON public.legal_representatives FOR UPDATE USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = legal_representatives.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can delete legal reps of their clients" ON public.legal_representatives FOR DELETE USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = legal_representatives.client_id AND clients.user_id = auth.uid()));

-- RLS Policies for products
CREATE POLICY "Users can view their own products" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON public.products FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for contracts
CREATE POLICY "Users can view their own contracts" ON public.contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contracts" ON public.contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contracts" ON public.contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contracts" ON public.contracts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for contract_products (via contract ownership)
CREATE POLICY "Users can view their contract products" ON public.contract_products FOR SELECT USING (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_products.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can create their contract products" ON public.contract_products FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_products.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can update their contract products" ON public.contract_products FOR UPDATE USING (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_products.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can delete their contract products" ON public.contract_products FOR DELETE USING (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_products.contract_id AND contracts.user_id = auth.uid()));

-- RLS Policies for discount_logs (via contract ownership)
CREATE POLICY "Users can view their discount logs" ON public.discount_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = discount_logs.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can create their discount logs" ON public.discount_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = discount_logs.contract_id AND contracts.user_id = auth.uid()));

-- RLS Policies for audit_logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email, 'sales');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();