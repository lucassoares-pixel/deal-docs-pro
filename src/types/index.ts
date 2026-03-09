// Client Types
export interface Client {
  id: string;
  company_name: string;
  trade_name: string;
  cnpj: string;
  state_registration?: string | null;
  email: string;
  phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  created_at: string;
  updated_at: string;
}

export interface LegalRepresentative {
  id: string;
  client_id: string;
  legal_name: string;
  cpf: string;
  role: string;
  email: string;
  phone: string;
}

// Product Types
export type BillingType = 'recurring' | 'one_time';
export type RecurringPeriod = 'monthly' | null;
export type DiscountPeriodType = 'indeterminate' | 'fixed_period';

export interface Product {
  id: string;
  name: string;
  description: string;
  billing_type: BillingType;
  recurring_period: RecurringPeriod;
  base_price: number;
  setup_price: number | null;
  allow_discount: boolean;
  max_discount_percentage: number;
  discount_period_type: DiscountPeriodType;
  discount_start_date: string | null;
  discount_end_date: string | null;
  fidelity_months: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Contract Types
export interface ContractProduct {
  product_id: string;
  product: Product;
  quantity: number;
  discount_percentage: number;
  discounted_price: number;
  full_price: number;
  custom_enrollment_price?: number | null;
  discount_period_type?: string | null;
  discount_months?: number | null;
  discount_end_date?: string | null;
}

export interface DiscountLog {
  product_id: string;
  product_name: string;
  original_price: number;
  discount_percentage: number;
  discounted_price: number;
  applied_at: string;
  applied_by: string;
}

export interface Contract {
  id: string;
  client_id: string;
  client: Client;
  legal_representative: LegalRepresentative;
  products: ContractProduct[];
  recurring_total_full: number;
  recurring_total_discounted: number;
  setup_total: number;
  discount_applied_log: DiscountLog[];
  start_date: string;
  billing_day: number;
  fidelity_months: number;
  extra_discount_value?: number | null;
  extra_discount_months?: number | null;
  extra_discount_period_type?: string | null;
  extra_discount_end_date?: string | null;
  training_contact_name?: string | null;
  training_contact_phone?: string | null;
  implementation_type?: string | null;
  certificate_type?: string | null;
  signed: boolean;
  sales_status: 'pendente' | 'concluido';
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

export type ContractStatus = 'draft' | 'pending' | 'active' | 'cancelled' | 'expired';

// Audit Types
export interface AuditLog {
  id: string;
  action: AuditAction;
  entity_type: 'product' | 'contract' | 'client' | 'user';
  entity_id: string;
  user_id: string;
  user_name: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  description: string;
  created_at: string;
}

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'price_change' 
  | 'discount_change' 
  | 'status_change';

// User Types
export type UserRole = 'admin' | 'sales';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

// Form Types
export interface ClientFormData {
  company_name: string;
  trade_name: string;
  cnpj: string;
  email: string;
  phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  legal_representative: {
    legal_name: string;
    cpf: string;
    role: string;
    email: string;
    phone: string;
  };
}

export interface ProductFormData {
  name: string;
  description: string;
  billing_type: BillingType;
  recurring_period: RecurringPeriod;
  base_price: number;
  setup_price: number | null;
  allow_discount: boolean;
  max_discount_percentage: number;
  discount_period_type: DiscountPeriodType;
  discount_start_date: string | null;
  discount_end_date: string | null;
  fidelity_months: number;
  active: boolean;
}

export interface ContractBuilderProduct {
  product: Product;
  quantity: number;
  discount_percentage: number;
}
