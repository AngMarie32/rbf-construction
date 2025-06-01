export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bid_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          project_id: string
          quantity: number
          subcategory: string | null
          template_id: string | null
          total: number | null
          unit: string | null
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          project_id: string
          quantity?: number
          subcategory?: string | null
          template_id?: string | null
          total?: number | null
          unit?: string | null
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          project_id?: string
          quantity?: number
          subcategory?: string | null
          template_id?: string | null
          total?: number | null
          unit?: string | null
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "bid_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_template_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          subcategory: string | null
          template_id: string | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          subcategory?: string | null
          template_id?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          subcategory?: string | null
          template_id?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "bid_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      burn_records: {
        Row: {
          actual_cost: number
          created_at: string | null
          date: string
          id: string
          planned_cost: number
          project_id: string
        }
        Insert: {
          actual_cost?: number
          created_at?: string | null
          date: string
          id?: string
          planned_cost?: number
          project_id: string
        }
        Update: {
          actual_cost?: number
          created_at?: string | null
          date?: string
          id?: string
          planned_cost?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "burn_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          description: string
          id: string
          number: string
          project_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          date: string
          description: string
          id?: string
          number: string
          project_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          number?: string
          project_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          hourly_rate: number
          id: string
          image: string | null
          name: string
          status: string | null
          updated_at: string | null
          value: number | null
          year: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          hourly_rate?: number
          id?: string
          image?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
          value?: number | null
          year?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          hourly_rate?: number
          id?: string
          image?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
          value?: number | null
          year?: number | null
        }
        Relationships: []
      }
      maintenance_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string
          description: string
          equipment_id: string
          id: string
          next_due: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          date: string
          description: string
          equipment_id: string
          id?: string
          next_due?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          date?: string
          description?: string
          equipment_id?: string
          id?: string
          next_due?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_applications: {
        Row: {
          application_number: number
          balance_to_finish: number | null
          contract_sum_to_date: number | null
          created_at: string | null
          current_payment_due: number | null
          id: string
          less_previous_payments: number | null
          net_changes: number | null
          original_contract_sum: number
          period_end_date: string
          project_id: string
          retainage: number | null
          total_completed_and_stored: number | null
          total_earned_less_retainage: number | null
        }
        Insert: {
          application_number: number
          balance_to_finish?: number | null
          contract_sum_to_date?: number | null
          created_at?: string | null
          current_payment_due?: number | null
          id?: string
          less_previous_payments?: number | null
          net_changes?: number | null
          original_contract_sum?: number
          period_end_date: string
          project_id: string
          retainage?: number | null
          total_completed_and_stored?: number | null
          total_earned_less_retainage?: number | null
        }
        Update: {
          application_number?: number
          balance_to_finish?: number | null
          contract_sum_to_date?: number | null
          created_at?: string | null
          current_payment_due?: number | null
          id?: string
          less_previous_payments?: number | null
          net_changes?: number | null
          original_contract_sum?: number
          period_end_date?: string
          project_id?: string
          retainage?: number | null
          total_completed_and_stored?: number | null
          total_earned_less_retainage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_applications_g702: {
        Row: {
          application_number: number
          architect_date: string | null
          architect_signature: string | null
          balance_to_finish: number | null
          contract_sum_to_date: number | null
          contractor_address: string | null
          contractor_date: string | null
          contractor_name: string
          contractor_signature: string | null
          created_at: string
          current_payment_due: number | null
          id: string
          less_previous_certificates: number | null
          net_change_by_change_orders: number | null
          original_contract_sum: number
          period_to: string
          project_id: string | null
          project_name: string
          project_number: string | null
          retainage_completed_work: number | null
          retainage_stored_materials: number | null
          total_completed_and_stored: number | null
          total_earned_less_retainage: number | null
          total_retainage: number | null
          updated_at: string
        }
        Insert: {
          application_number: number
          architect_date?: string | null
          architect_signature?: string | null
          balance_to_finish?: number | null
          contract_sum_to_date?: number | null
          contractor_address?: string | null
          contractor_date?: string | null
          contractor_name: string
          contractor_signature?: string | null
          created_at?: string
          current_payment_due?: number | null
          id?: string
          less_previous_certificates?: number | null
          net_change_by_change_orders?: number | null
          original_contract_sum?: number
          period_to: string
          project_id?: string | null
          project_name: string
          project_number?: string | null
          retainage_completed_work?: number | null
          retainage_stored_materials?: number | null
          total_completed_and_stored?: number | null
          total_earned_less_retainage?: number | null
          total_retainage?: number | null
          updated_at?: string
        }
        Update: {
          application_number?: number
          architect_date?: string | null
          architect_signature?: string | null
          balance_to_finish?: number | null
          contract_sum_to_date?: number | null
          contractor_address?: string | null
          contractor_date?: string | null
          contractor_name?: string
          contractor_signature?: string | null
          created_at?: string
          current_payment_due?: number | null
          id?: string
          less_previous_certificates?: number | null
          net_change_by_change_orders?: number | null
          original_contract_sum?: number
          period_to?: string
          project_id?: string | null
          project_name?: string
          project_number?: string | null
          retainage_completed_work?: number | null
          retainage_stored_materials?: number | null
          total_completed_and_stored?: number | null
          total_earned_less_retainage?: number | null
          total_retainage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_g702_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          completion_percentage: number | null
          contract_value: number
          created_at: string | null
          due_date: string | null
          id: string
          name: string
          net_change_orders: number | null
          original_contract_sum: number | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          completion_percentage?: number | null
          contract_value?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          name: string
          net_change_orders?: number | null
          original_contract_sum?: number | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          completion_percentage?: number | null
          contract_value?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          name?: string
          net_change_orders?: number | null
          original_contract_sum?: number | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          amount: number
          client: string
          created_at: string | null
          id: string
          project_name: string
          scope: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          client: string
          created_at?: string | null
          id?: string
          project_name: string
          scope?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client?: string
          created_at?: string | null
          id?: string
          project_name?: string
          scope?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sov_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          item_number: string
          materials_presently_stored: number | null
          materials_stored: number | null
          percent_complete: number | null
          previous_applications: number | null
          project_id: string
          retainage_percentage: number | null
          scheduled_value: number
          this_period: number | null
          total_completed_and_stored: number | null
          updated_at: string | null
          work_completed_from_previous: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          item_number: string
          materials_presently_stored?: number | null
          materials_stored?: number | null
          percent_complete?: number | null
          previous_applications?: number | null
          project_id: string
          retainage_percentage?: number | null
          scheduled_value?: number
          this_period?: number | null
          total_completed_and_stored?: number | null
          updated_at?: string | null
          work_completed_from_previous?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          item_number?: string
          materials_presently_stored?: number | null
          materials_stored?: number | null
          percent_complete?: number | null
          previous_applications?: number | null
          project_id?: string
          retainage_percentage?: number | null
          scheduled_value?: number
          this_period?: number | null
          total_completed_and_stored?: number | null
          updated_at?: string | null
          work_completed_from_previous?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sov_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          dependencies: string[] | null
          end_date: string | null
          id: string
          progress: number | null
          project_id: string
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dependencies?: string[] | null
          end_date?: string | null
          id?: string
          progress?: number | null
          project_id: string
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dependencies?: string[] | null
          end_date?: string | null
          id?: string
          progress?: number | null
          project_id?: string
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
