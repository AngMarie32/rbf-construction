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
      bid_package_items: {
        Row: {
          bid_package_id: string | null
          category: string
          created_at: string | null
          description: string
          estimated_cost: number | null
          id: string
          quantity: number
          unit: string | null
        }
        Insert: {
          bid_package_id?: string | null
          category: string
          created_at?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          quantity?: number
          unit?: string | null
        }
        Update: {
          bid_package_id?: string | null
          category?: string
          created_at?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_package_items_bid_package_id_fkey"
            columns: ["bid_package_id"]
            isOneToOne: false
            referencedRelation: "bid_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_packages: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          estimated_value: number | null
          id: string
          name: string
          project_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_value?: number | null
          id?: string
          name: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_value?: number | null
          id?: string
          name?: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      billing_line_items: {
        Row: {
          billing_id: string
          created_at: string
          description: string
          id: string
          quantity: number
          sov_item_id: string | null
          total_amount: number | null
          unit_price: number
        }
        Insert: {
          billing_id: string
          created_at?: string
          description: string
          id?: string
          quantity?: number
          sov_item_id?: string | null
          total_amount?: number | null
          unit_price?: number
        }
        Update: {
          billing_id?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          sov_item_id?: string | null
          total_amount?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_line_items_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "project_billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_line_items_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "sov_items"
            referencedColumns: ["id"]
          },
        ]
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
      company_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          created_at: string | null
          default_retainage_rate: number | null
          default_tax_rate: number | null
          id: string
          logo_url: string | null
          updated_at: string | null
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          created_at?: string | null
          default_retainage_rate?: number | null
          default_tax_rate?: number | null
          id?: string
          logo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          created_at?: string | null
          default_retainage_rate?: number | null
          default_tax_rate?: number | null
          id?: string
          logo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_current_version: boolean | null
          mime_type: string | null
          name: string
          project_id: string | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_current_version?: boolean | null
          mime_type?: string | null
          name: string
          project_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_current_version?: boolean | null
          mime_type?: string | null
          name?: string
          project_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          project_id: string
          receipt_number: string | null
          status: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          project_id: string
          receipt_number?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          project_id?: string
          receipt_number?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_address: string | null
          client_name: string
          created_at: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          project_id: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_address?: string | null
          client_name: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          project_id?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          client_address?: string | null
          client_name?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          project_id?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      project_billing: {
        Row: {
          billed_amount: number
          billing_period_end: string
          billing_period_start: string
          created_at: string
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          paid_amount: number
          payment_date: string | null
          project_id: string
          remaining_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          billed_amount?: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          paid_amount?: number
          payment_date?: string | null
          project_id: string
          remaining_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          billed_amount?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          paid_amount?: number
          payment_date?: string | null
          project_id?: string
          remaining_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_billing_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subcontractors: {
        Row: {
          contract_amount: number | null
          created_at: string | null
          end_date: string | null
          id: string
          project_id: string | null
          role: string | null
          start_date: string | null
          status: string | null
          subcontractor_id: string | null
        }
        Insert: {
          contract_amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          project_id?: string | null
          role?: string | null
          start_date?: string | null
          status?: string | null
          subcontractor_id?: string | null
        }
        Update: {
          contract_amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          project_id?: string | null
          role?: string | null
          start_date?: string | null
          status?: string | null
          subcontractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_subcontractors_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          client: string | null
          completion_percentage: number | null
          contract_value: number
          created_at: string | null
          due_date: string | null
          id: string
          name: string
          net_change_orders: number | null
          original_contract_sum: number | null
          project_code: string | null
          start_date: string | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client?: string | null
          completion_percentage?: number | null
          contract_value?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          name: string
          net_change_orders?: number | null
          original_contract_sum?: number | null
          project_code?: string | null
          start_date?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client?: string | null
          completion_percentage?: number | null
          contract_value?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          name?: string
          net_change_orders?: number | null
          original_contract_sum?: number | null
          project_code?: string | null
          start_date?: string | null
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
      schedule_template_items: {
        Row: {
          category: string | null
          created_at: string
          dependencies: string[] | null
          description: string | null
          duration: number
          id: string
          template_id: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          dependencies?: string[] | null
          description?: string | null
          duration?: number
          id?: string
          template_id?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          dependencies?: string[] | null
          description?: string | null
          duration?: number
          id?: string
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
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
      sov_item_change_orders: {
        Row: {
          amount: number
          change_order_id: string | null
          created_at: string
          id: string
          sov_item_id: string | null
        }
        Insert: {
          amount?: number
          change_order_id?: string | null
          created_at?: string
          id?: string
          sov_item_id?: string | null
        }
        Update: {
          amount?: number
          change_order_id?: string | null
          created_at?: string
          id?: string
          sov_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sov_item_change_orders_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_item_change_orders_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "sov_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_items: {
        Row: {
          category: string
          change_orders: number | null
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
          change_orders?: number | null
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
          change_orders?: number | null
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
      subcontractors: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          insurance_expiry: string | null
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          specialties: string[] | null
          state: string | null
          status: string | null
          travel_radius: number | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          travel_radius?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          travel_radius?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
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
