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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bid_invitation_documents: {
        Row: {
          bid_invitation_id: string | null
          created_at: string
          document_id: string | null
          id: string
        }
        Insert: {
          bid_invitation_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
        }
        Update: {
          bid_invitation_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_invitation_documents_bid_invitation_id_fkey"
            columns: ["bid_invitation_id"]
            isOneToOne: false
            referencedRelation: "bid_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_invitation_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_invitation_recipients: {
        Row: {
          bid_invitation_id: string | null
          created_at: string
          id: string
          opened_at: string | null
          responded_at: string | null
          sent_at: string | null
          status: string
          subcontractor_id: string | null
        }
        Insert: {
          bid_invitation_id?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          subcontractor_id?: string | null
        }
        Update: {
          bid_invitation_id?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          subcontractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_invitation_recipients_bid_invitation_id_fkey"
            columns: ["bid_invitation_id"]
            isOneToOne: false
            referencedRelation: "bid_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_invitation_recipients_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_invitations: {
        Row: {
          bid_package_id: string | null
          created_at: string
          due_date: string | null
          id: string
          message: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          bid_package_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          message?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          bid_package_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          message?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_invitations_bid_package_id_fkey"
            columns: ["bid_package_id"]
            isOneToOne: false
            referencedRelation: "bid_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          division: string | null
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
          division?: string | null
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
          division?: string | null
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
          document_id: string | null
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
          document_id?: string | null
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
          document_id?: string | null
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
          {
            foreignKeyName: "bid_package_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
      bid_settings: {
        Row: {
          contingency_percentage: number | null
          created_at: string
          id: string
          include_tax: boolean | null
          markup_percentage: number | null
          project_id: string
          round_to_nearest: number | null
          tax_percentage: number | null
          updated_at: string
        }
        Insert: {
          contingency_percentage?: number | null
          created_at?: string
          id?: string
          include_tax?: boolean | null
          markup_percentage?: number | null
          project_id: string
          round_to_nearest?: number | null
          tax_percentage?: number | null
          updated_at?: string
        }
        Update: {
          contingency_percentage?: number | null
          created_at?: string
          id?: string
          include_tax?: boolean | null
          markup_percentage?: number | null
          project_id?: string
          round_to_nearest?: number | null
          tax_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
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
      budget_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          current_percentage: number
          id: string
          is_acknowledged: boolean | null
          message: string
          project_id: string
          severity: string | null
          threshold_percentage: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          current_percentage: number
          id?: string
          is_acknowledged?: boolean | null
          message: string
          project_id: string
          severity?: string | null
          threshold_percentage: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          current_percentage?: number
          id?: string
          is_acknowledged?: boolean | null
          message?: string
          project_id?: string
          severity?: string | null
          threshold_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_forecasts: {
        Row: {
          confidence_level: number | null
          created_at: string
          forecast_date: string
          forecast_method: string | null
          forecast_month: string
          id: string
          predicted_spend: number
          project_id: string
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string
          forecast_date: string
          forecast_method?: string | null
          forecast_month: string
          id?: string
          predicted_spend?: number
          project_id: string
        }
        Update: {
          confidence_level?: number | null
          created_at?: string
          forecast_date?: string
          forecast_method?: string | null
          forecast_month?: string
          id?: string
          predicted_spend?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_variances: {
        Row: {
          actual_amount: number
          category_id: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          planned_amount: number
          project_id: string
          risk_level: string | null
          updated_at: string
          variance_amount: number | null
          variance_percentage: number | null
          variance_reason: string | null
        }
        Insert: {
          actual_amount?: number
          category_id: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          planned_amount?: number
          project_id: string
          risk_level?: string | null
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
          variance_reason?: string | null
        }
        Update: {
          actual_amount?: number
          category_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          planned_amount?: number
          project_id?: string
          risk_level?: string | null
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_variances_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_variances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      calendar_events: {
        Row: {
          attendees: string[] | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          recurring_days: number[] | null
          recurring_type: string | null
          start_date: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          recurring_days?: number[] | null
          recurring_type?: string | null
          start_date: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          recurring_days?: number[] | null
          recurring_type?: string | null
          start_date?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      chat_participants: {
        Row: {
          chat_room_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          chat_room_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          chat_room_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_participants_room_id"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_rooms_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          default_contingency_type: string | null
          default_contingency_value: number | null
          default_retainage_rate: number | null
          default_tax_rate: number | null
          id: string
          logo_url: string | null
          overhead_percentage: number | null
          profit_margin: number | null
          updated_at: string | null
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          created_at?: string | null
          default_contingency_type?: string | null
          default_contingency_value?: number | null
          default_retainage_rate?: number | null
          default_tax_rate?: number | null
          id?: string
          logo_url?: string | null
          overhead_percentage?: number | null
          profit_margin?: number | null
          updated_at?: string | null
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          created_at?: string | null
          default_contingency_type?: string | null
          default_contingency_value?: number | null
          default_retainage_rate?: number | null
          default_tax_rate?: number | null
          id?: string
          logo_url?: string | null
          overhead_percentage?: number | null
          profit_margin?: number | null
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
          depreciation_rate: number | null
          description: string | null
          hourly_rate: number
          id: string
          image: string | null
          insurance_expiry: string | null
          last_inspection_date: string | null
          location: string | null
          name: string
          project_assignment_id: string | null
          purchase_date: string | null
          qr_code: string | null
          specifications: Json | null
          status: string | null
          total_hours_used: number | null
          updated_at: string | null
          value: number | null
          vin_serial_number: string | null
          year: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          depreciation_rate?: number | null
          description?: string | null
          hourly_rate?: number
          id?: string
          image?: string | null
          insurance_expiry?: string | null
          last_inspection_date?: string | null
          location?: string | null
          name: string
          project_assignment_id?: string | null
          purchase_date?: string | null
          qr_code?: string | null
          specifications?: Json | null
          status?: string | null
          total_hours_used?: number | null
          updated_at?: string | null
          value?: number | null
          vin_serial_number?: string | null
          year?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          depreciation_rate?: number | null
          description?: string | null
          hourly_rate?: number
          id?: string
          image?: string | null
          insurance_expiry?: string | null
          last_inspection_date?: string | null
          location?: string | null
          name?: string
          project_assignment_id?: string | null
          purchase_date?: string | null
          qr_code?: string | null
          specifications?: Json | null
          status?: string | null
          total_hours_used?: number | null
          updated_at?: string | null
          value?: number | null
          vin_serial_number?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_project_assignment_id_fkey"
            columns: ["project_assignment_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_alert_settings: {
        Row: {
          alert_days_before: number
          alert_type: string
          created_at: string
          equipment_id: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          alert_days_before?: number
          alert_type: string
          created_at?: string
          equipment_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          alert_days_before?: number
          alert_type?: string
          created_at?: string
          equipment_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_alert_settings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          due_date: string | null
          equipment_id: string
          id: string
          is_acknowledged: boolean | null
          message: string
          severity: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          due_date?: string | null
          equipment_id: string
          id?: string
          is_acknowledged?: boolean | null
          message: string
          severity?: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          due_date?: string | null
          equipment_id?: string
          id?: string
          is_acknowledged?: boolean | null
          message?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_alerts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_reservations: {
        Row: {
          created_at: string
          end_date: string
          equipment_id: string
          id: string
          notes: string | null
          project_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          equipment_id: string
          id?: string
          notes?: string | null
          project_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          project_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_reservations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_reservations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_usage_logs: {
        Row: {
          created_at: string
          end_time: string | null
          equipment_id: string
          fuel_consumed: number | null
          hours_used: number | null
          id: string
          operator_name: string | null
          project_id: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          equipment_id: string
          fuel_consumed?: number | null
          hours_used?: number | null
          id?: string
          operator_name?: string | null
          project_id?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          equipment_id?: string
          fuel_consumed?: number | null
          hours_used?: number | null
          id?: string
          operator_name?: string | null
          project_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_usage_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_audit_events: {
        Row: {
          actor_email: string | null
          actor_name: string | null
          created_at: string
          envelope_id: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          signer_id: string | null
          user_agent: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_name?: string | null
          created_at?: string
          envelope_id: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signer_id?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_name?: string | null
          created_at?: string
          envelope_id?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signer_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esign_audit_events_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "esign_envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esign_audit_events_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "esign_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_document_types: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      esign_envelopes: {
        Row: {
          archived_at: string | null
          certificate_path: string | null
          company: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          document_type: string | null
          expires_at: string | null
          id: string
          last_reminder_sent_at: string | null
          message: string | null
          original_pdf_path: string | null
          payment_app_number: string | null
          project_id: string | null
          reminder_cadence_days: number | null
          reminder_count: number
          sent_at: string | null
          signed_pdf_path: string | null
          signing_order: string
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          archived_at?: string | null
          certificate_path?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          expires_at?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          message?: string | null
          original_pdf_path?: string | null
          payment_app_number?: string | null
          project_id?: string | null
          reminder_cadence_days?: number | null
          reminder_count?: number
          sent_at?: string | null
          signed_pdf_path?: string | null
          signing_order?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          archived_at?: string | null
          certificate_path?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          expires_at?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          message?: string | null
          original_pdf_path?: string | null
          payment_app_number?: string | null
          project_id?: string | null
          reminder_cadence_days?: number | null
          reminder_count?: number
          sent_at?: string | null
          signed_pdf_path?: string | null
          signing_order?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: []
      }
      esign_fields: {
        Row: {
          created_at: string
          envelope_id: string
          field_type: string
          filled_at: string | null
          height_pct: number
          id: string
          page_number: number
          required: boolean
          signer_id: string | null
          value: string | null
          width_pct: number
          x_pct: number
          y_pct: number
        }
        Insert: {
          created_at?: string
          envelope_id: string
          field_type: string
          filled_at?: string | null
          height_pct?: number
          id?: string
          page_number?: number
          required?: boolean
          signer_id?: string | null
          value?: string | null
          width_pct?: number
          x_pct: number
          y_pct: number
        }
        Update: {
          created_at?: string
          envelope_id?: string
          field_type?: string
          filled_at?: string | null
          height_pct?: number
          id?: string
          page_number?: number
          required?: boolean
          signer_id?: string | null
          value?: string | null
          width_pct?: number
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "esign_fields_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "esign_envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esign_fields_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "esign_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_signers: {
        Row: {
          access_token: string
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          email: string
          envelope_id: string
          id: string
          ip_address: string | null
          name: string
          notified_at: string | null
          order_index: number
          signature_data: string | null
          signature_type: string | null
          signed_at: string | null
          status: string
          token_expires_at: string | null
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          access_token?: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          email: string
          envelope_id: string
          id?: string
          ip_address?: string | null
          name: string
          notified_at?: string | null
          order_index?: number
          signature_data?: string | null
          signature_type?: string | null
          signed_at?: string | null
          status?: string
          token_expires_at?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          email?: string
          envelope_id?: string
          id?: string
          ip_address?: string | null
          name?: string
          notified_at?: string | null
          order_index?: number
          signature_data?: string | null
          signature_type?: string | null
          signed_at?: string | null
          status?: string
          token_expires_at?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esign_signers_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "esign_envelopes"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          default_fields: Json | null
          description: string | null
          document_type: string | null
          id: string
          is_system: boolean
          name: string
          source_pdf_path: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_fields?: Json | null
          description?: string | null
          document_type?: string | null
          id?: string
          is_system?: boolean
          name: string
          source_pdf_path?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_fields?: Json | null
          description?: string | null
          document_type?: string | null
          id?: string
          is_system?: boolean
          name?: string
          source_pdf_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
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
      messages: {
        Row: {
          chat_room_id: string
          content: string
          created_at: string
          file_url: string | null
          id: string
          message_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_room_id: string
          content: string
          created_at?: string
          file_url?: string | null
          id?: string
          message_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_room_id?: string
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          message_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_room_id"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_messages_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
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
          email_verification_code: string | null
          email_verification_status: string | null
          email_verified: boolean | null
          id: string
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          email_verification_code?: string | null
          email_verification_status?: string | null
          email_verified?: boolean | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          email_verification_code?: string | null
          email_verification_status?: string | null
          email_verified?: boolean | null
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
          archived_at: string | null
          client: string | null
          completion_percentage: number | null
          contingency_type: string | null
          contingency_value: number | null
          contract_value: number
          created_at: string | null
          description: string | null
          due_date: string | null
          field_leader: string | null
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
          archived_at?: string | null
          client?: string | null
          completion_percentage?: number | null
          contingency_type?: string | null
          contingency_value?: number | null
          contract_value?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          field_leader?: string | null
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
          archived_at?: string | null
          client?: string | null
          completion_percentage?: number | null
          contingency_type?: string | null
          contingency_value?: number | null
          contract_value?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          field_leader?: string | null
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
      role_change_requests: {
        Row: {
          admin_notes: string | null
          existing_role: string
          id: string
          reason: string | null
          requested_at: string
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          existing_role: string
          id?: string
          reason?: string | null
          requested_at?: string
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          existing_role?: string
          id?: string
          reason?: string | null
          requested_at?: string
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
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
          subcategory: string | null
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
          subcategory?: string | null
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
          subcategory?: string | null
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
      subcontractor_group_members: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          subcontractor_id: string | null
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          subcontractor_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          subcontractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_group_members_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          w9_on_file: boolean | null
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
          w9_on_file?: boolean | null
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
          w9_on_file?: boolean | null
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
      approve_role_change: {
        Args: { admin_notes?: string; request_id: string }
        Returns: undefined
      }
      generate_equipment_alerts: { Args: never; Returns: undefined }
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
