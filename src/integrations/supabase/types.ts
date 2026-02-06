export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address_city: string
          address_neighborhood: string
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          cnpj: string
          company_name: string
          created_at: string
          email: string
          id: string
          phone: string
          trade_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city: string
          address_neighborhood: string
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          cnpj: string
          company_name: string
          created_at?: string
          email: string
          id?: string
          phone: string
          trade_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string
          address_neighborhood?: string
          address_number?: string
          address_state?: string
          address_street?: string
          address_zip?: string
          cnpj?: string
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string
          trade_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contract_products: {
        Row: {
          contract_id: string
          created_at: string
          custom_enrollment_price: number | null
          discount_end_date: string | null
          discount_months: number | null
          discount_percentage: number
          discount_period_type: string | null
          discounted_price: number
          full_price: number
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          custom_enrollment_price?: number | null
          discount_end_date?: string | null
          discount_months?: number | null
          discount_percentage?: number
          discount_period_type?: string | null
          discounted_price: number
          full_price: number
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          custom_enrollment_price?: number | null
          discount_end_date?: string | null
          discount_months?: number | null
          discount_percentage?: number
          discount_period_type?: string | null
          discounted_price?: number
          full_price?: number
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_products_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          billing_day: number
          client_id: string
          created_at: string
          extra_discount_end_date: string | null
          extra_discount_months: number | null
          extra_discount_period_type: string | null
          extra_discount_value: number | null
          fidelity_months: number
          id: string
          legal_representative_id: string | null
          recurring_total_discounted: number
          recurring_total_full: number
          setup_total: number
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_day?: number
          client_id: string
          created_at?: string
          extra_discount_end_date?: string | null
          extra_discount_months?: number | null
          extra_discount_period_type?: string | null
          extra_discount_value?: number | null
          fidelity_months?: number
          id?: string
          legal_representative_id?: string | null
          recurring_total_discounted?: number
          recurring_total_full?: number
          setup_total?: number
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_day?: number
          client_id?: string
          created_at?: string
          extra_discount_end_date?: string | null
          extra_discount_months?: number | null
          extra_discount_period_type?: string | null
          extra_discount_value?: number | null
          fidelity_months?: number
          id?: string
          legal_representative_id?: string | null
          recurring_total_discounted?: number
          recurring_total_full?: number
          setup_total?: number
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_legal_representative_id_fkey"
            columns: ["legal_representative_id"]
            isOneToOne: false
            referencedRelation: "legal_representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_logs: {
        Row: {
          applied_at: string
          applied_by: string
          contract_id: string
          discount_percentage: number
          discounted_price: number
          id: string
          original_price: number
          product_id: string
          product_name: string
        }
        Insert: {
          applied_at?: string
          applied_by: string
          contract_id: string
          discount_percentage: number
          discounted_price: number
          id?: string
          original_price: number
          product_id: string
          product_name: string
        }
        Update: {
          applied_at?: string
          applied_by?: string
          contract_id?: string
          discount_percentage?: number
          discounted_price?: number
          id?: string
          original_price?: number
          product_id?: string
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_discount_logs: {
        Row: {
          applied_at: string
          applied_by: string
          contract_id: string
          discount_end_date: string | null
          discount_months: number | null
          discount_period_type: string
          discount_value: number
          id: string
        }
        Insert: {
          applied_at?: string
          applied_by: string
          contract_id: string
          discount_end_date?: string | null
          discount_months?: number | null
          discount_period_type?: string
          discount_value: number
          id?: string
        }
        Update: {
          applied_at?: string
          applied_by?: string
          contract_id?: string
          discount_end_date?: string | null
          discount_months?: number | null
          discount_period_type?: string
          discount_value?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_discount_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_representatives: {
        Row: {
          client_id: string
          cpf: string
          created_at: string
          email: string
          id: string
          legal_name: string
          phone: string
          role: string
        }
        Insert: {
          client_id: string
          cpf: string
          created_at?: string
          email: string
          id?: string
          legal_name: string
          phone: string
          role: string
        }
        Update: {
          client_id?: string
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          legal_name?: string
          phone?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_representatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          allow_discount: boolean
          base_price: number
          billing_type: string
          cost_price: number | null
          created_at: string
          description: string
          discount_end_date: string | null
          discount_period_type: string
          discount_start_date: string | null
          fidelity_months: number
          id: string
          implementation_price: number | null
          max_discount_percentage: number
          name: string
          product_type: string
          recurring_period: string | null
          setup_price: number | null
          sku: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          allow_discount?: boolean
          base_price: number
          billing_type: string
          cost_price?: number | null
          created_at?: string
          description: string
          discount_end_date?: string | null
          discount_period_type?: string
          discount_start_date?: string | null
          fidelity_months?: number
          id?: string
          implementation_price?: number | null
          max_discount_percentage?: number
          name: string
          product_type?: string
          recurring_period?: string | null
          setup_price?: number | null
          sku?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          allow_discount?: boolean
          base_price?: number
          billing_type?: string
          cost_price?: number | null
          created_at?: string
          description?: string
          discount_end_date?: string | null
          discount_period_type?: string
          discount_start_date?: string | null
          fidelity_months?: number
          id?: string
          implementation_price?: number | null
          max_discount_percentage?: number
          name?: string
          product_type?: string
          recurring_period?: string | null
          setup_price?: number | null
          sku?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
