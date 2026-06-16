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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
