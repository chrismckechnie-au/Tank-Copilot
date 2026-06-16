export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          plan: "free" | "hobby_pro" | "reef_pro" | "service_pro" | "lfs";
          role: "user" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string;
          plan?: "free" | "hobby_pro" | "reef_pro" | "service_pro" | "lfs";
          role?: "user" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          plan?: "free" | "hobby_pro" | "reef_pro" | "service_pro" | "lfs";
          role?: "user" | "admin";
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          logo_path: string | null;
          plan: "pilot" | "service_pro" | "lfs";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          logo_path?: string | null;
          plan?: "pilot" | "service_pro" | "lfs";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
        Relationships: [];
      };
      team_members: {
        Row: {
          business_id: string;
          user_id: string;
          role: "admin" | "editor" | "viewer";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          user_id: string;
          role: "admin" | "editor" | "viewer";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          contact: string;
          location: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          contact?: string;
          location?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      entitlements: {
        Row: {
          id: string;
          user_id: string | null;
          business_id: string | null;
          plan: "free" | "hobby_pro" | "reef_pro" | "service_pro" | "lfs";
          status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          current_period_end: string | null;
          limits: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          business_id?: string | null;
          plan?: "free" | "hobby_pro" | "reef_pro" | "service_pro" | "lfs";
          status?: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          current_period_end?: string | null;
          limits?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["entitlements"]["Insert"]>;
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          stripe_event_type: string;
          stripe_object_id: string;
          stripe_event_fingerprint: string;
          processed_at: string | null;
          processing_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          stripe_event_type: string;
          stripe_object_id: string;
          stripe_event_fingerprint: string;
          processed_at?: string | null;
          processing_error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["webhook_events"]["Insert"]>;
        Relationships: [];
      };
      tanks: {
        Row: {
          id: string;
          user_id: string;
          business_id: string | null;
          client_id: string | null;
          name: string;
          type: "fw" | "planted" | "reef";
          volume_liters: number;
          unit_system: "metric" | "imperial";
          start_date: string | null;
          water_source: string;
          target_ranges: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id?: string | null;
          client_id?: string | null;
          name: string;
          type: "fw" | "planted" | "reef";
          volume_liters: number;
          unit_system: "metric" | "imperial";
          start_date?: string | null;
          water_source: string;
          target_ranges?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tanks"]["Insert"]>;
        Relationships: [];
      };
      tank_equipment: {
        Row: {
          id: string;
          tank_id: string;
          category: string;
          name: string;
          installed_at: string | null;
          status: "active" | "needs_attention" | "retired";
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          category: string;
          name: string;
          installed_at?: string | null;
          status?: "active" | "needs_attention" | "retired";
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tank_equipment"]["Insert"]>;
        Relationships: [];
      };
      water_tests: {
        Row: {
          id: string;
          tank_id: string;
          tested_at: string;
          ammonia: number | null;
          nitrite: number | null;
          nitrate: number | null;
          ph: number | null;
          temp_c: number | null;
          salinity: number | null;
          kh: number | null;
          gh: number | null;
          phosphate: number | null;
          calcium: number | null;
          magnesium: number | null;
          notes: string;
          photo_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          tested_at?: string;
          ammonia?: number | null;
          nitrite?: number | null;
          nitrate?: number | null;
          ph?: number | null;
          temp_c?: number | null;
          salinity?: number | null;
          kh?: number | null;
          gh?: number | null;
          phosphate?: number | null;
          calcium?: number | null;
          magnesium?: number | null;
          notes?: string;
          photo_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["water_tests"]["Insert"]>;
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: string;
          tank_id: string;
          water_test_id: string;
          source_event_id: string;
          source_type: "water_test";
          severity: "green" | "yellow" | "red";
          flags: string[];
          rule_ids: string[];
          rule_version: string;
          explanation: string;
          explanations: Json;
          checklist: Json;
          confidence: "low" | "medium" | "high";
          review_status: "unsigned" | "signed";
          display_mode: "info_only" | "actionable";
          missing_fields: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          water_test_id: string;
          source_event_id: string;
          source_type?: "water_test";
          severity: "green" | "yellow" | "red";
          flags?: string[];
          rule_ids?: string[];
          rule_version: string;
          explanation: string;
          explanations?: Json;
          checklist?: Json;
          confidence: "low" | "medium" | "high";
          review_status?: "unsigned" | "signed";
          display_mode?: "info_only" | "actionable";
          missing_fields?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recommendations"]["Insert"]>;
        Relationships: [];
      };
      observations: {
        Row: {
          id: string;
          tank_id: string;
          symptoms: Json;
          affected_livestock: string;
          photo_paths: string[];
          recent_changes: string;
          severity: "routine" | "watch" | "urgent";
          follow_up_prompts: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          symptoms?: Json;
          affected_livestock?: string;
          photo_paths?: string[];
          recent_changes?: string;
          severity?: "routine" | "watch" | "urgent";
          follow_up_prompts?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["observations"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          tank_id: string;
          owner_user_id: string;
          business_id: string | null;
          type: "community" | "lfs" | "service";
          generated_at: string;
          content: Json;
          sanitized_public_content: Json;
          share_id: string;
          share_enabled: boolean;
          share_expires_at: string | null;
          pdf_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          owner_user_id: string;
          business_id?: string | null;
          type?: "community" | "lfs" | "service";
          generated_at?: string;
          content: Json;
          sanitized_public_content: Json;
          share_id?: string;
          share_enabled?: boolean;
          share_expires_at?: string | null;
          pdf_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      maintenance_tasks: {
        Row: {
          id: string;
          tank_id: string;
          title: string;
          category:
            | "water_change"
            | "water_test"
            | "filter"
            | "dosing"
            | "equipment"
            | "livestock"
            | "other";
          cadence_days: number;
          last_completed_on: string | null;
          next_due_on: string;
          reminder_enabled: boolean;
          seed_key: "water_test" | "water_change" | "filter_flow" | "reef_stability" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          title: string;
          category:
            | "water_change"
            | "water_test"
            | "filter"
            | "dosing"
            | "equipment"
            | "livestock"
            | "other";
          cadence_days: number;
          last_completed_on?: string | null;
          next_due_on: string;
          reminder_enabled?: boolean;
          seed_key?: "water_test" | "water_change" | "filter_flow" | "reef_stability" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_tasks"]["Insert"]>;
        Relationships: [];
      };
      maintenance_reminder_deliveries: {
        Row: {
          id: string;
          task_id: string;
          owner_user_id: string;
          due_on: string;
          status: "pending" | "sending" | "sent" | "failed" | "skipped";
          attempts: number;
          next_attempt_at: string;
          sent_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          owner_user_id: string;
          due_on: string;
          status?: "pending" | "sending" | "sent" | "failed" | "skipped";
          attempts?: number;
          next_attempt_at?: string;
          sent_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_reminder_deliveries"]["Insert"]>;
        Relationships: [];
      };
      livestock: {
        Row: {
          id: string;
          tank_id: string;
          species_name: string;
          common_name: string;
          quantity: number;
          added_at: string | null;
          status: "active" | "quarantine" | "planned" | "removed" | "deceased";
          notes: string;
          photo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          species_name: string;
          common_name?: string;
          quantity?: number;
          added_at?: string | null;
          status?: "active" | "quarantine" | "planned" | "removed" | "deceased";
          notes?: string;
          photo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["livestock"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_hobby_tank: {
        Args: {
          p_name: string;
          p_type: "fw" | "planted" | "reef";
          p_volume_liters: number;
          p_unit_system: "metric" | "imperial";
          p_start_date: string | null;
          p_water_source: string;
          p_target_ranges: Json;
          p_equipment_category: string | null;
          p_equipment_name: string | null;
        };
        Returns: string;
      };
      create_business: {
        Args: {
          p_name: string;
          p_logo_path?: string | null;
        };
        Returns: string;
      };
      create_client_tank: {
        Args: {
          p_business_id: string;
          p_client_id: string;
          p_name: string;
          p_type: "fw" | "planted" | "reef";
          p_volume_liters: number;
          p_unit_system: "metric" | "imperial";
          p_start_date: string | null;
          p_water_source: string;
          p_target_ranges: Json;
          p_equipment_category: string | null;
          p_equipment_name: string | null;
        };
        Returns: string;
      };
      process_stripe_subscription_event: {
        Args: {
          p_stripe_event_id: string;
          p_stripe_event_type: string;
          p_stripe_object_id: string;
          p_stripe_customer_id: string;
          p_stripe_subscription_id: string;
          p_stripe_price_id: string;
          p_plan: "hobby_pro" | "reef_pro" | "service_pro" | "lfs";
          p_status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
          p_user_id: string | null;
          p_business_id: string | null;
          p_current_period_end: string | null;
        };
        Returns: Json;
      };
      create_observation: {
        Args: {
          p_tank_id: string;
          p_symptoms: string[];
          p_affected_livestock: string;
          p_recent_changes: string;
          p_photo_paths?: string[];
        };
        Returns: string;
      };
      complete_maintenance_task: {
        Args: {
          p_task_id: string;
          p_completed_on?: string;
        };
        Returns: string;
      };
      reschedule_maintenance_task: {
        Args: {
          p_task_id: string;
          p_next_due_on: string;
        };
        Returns: string;
      };
      enqueue_due_maintenance_reminders: {
        Args: {
          p_due_on?: string;
        };
        Returns: number;
      };
      claim_maintenance_reminders: {
        Args: {
          p_limit?: number;
        };
        Returns: Array<{
          delivery_id: string;
          task_id: string;
          task_title: string;
          tank_name: string;
          owner_email: string;
          due_on: string;
          attempt: number;
        }>;
      };
      record_maintenance_reminder_delivery: {
        Args: {
          p_delivery_id: string;
          p_success: boolean;
          p_last_error?: string | null;
        };
        Returns: undefined;
      };
      get_public_report: {
        Args: {
          p_share_id: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
