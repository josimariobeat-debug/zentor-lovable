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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appearance_presets: {
        Row: {
          config: Json
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          kind: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      installed_apps: {
        Row: {
          app_id: string | null
          app_key: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_installed: boolean | null
          name: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          app_id?: string | null
          app_key?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_installed?: boolean | null
          name: string
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          app_id?: string | null
          app_key?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_installed?: boolean | null
          name?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      measure_models: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      measure_rows: {
        Row: {
          created_at: string
          id: string
          measure_type: string
          model_id: string
          position: number
          size_name: string
          updated_at: string
          user_id: string
          value_cm: number
        }
        Insert: {
          created_at?: string
          id?: string
          measure_type: string
          model_id: string
          position?: number
          size_name: string
          updated_at?: string
          user_id: string
          value_cm: number
        }
        Update: {
          created_at?: string
          id?: string
          measure_type?: string
          model_id?: string
          position?: number
          size_name?: string
          updated_at?: string
          user_id?: string
          value_cm?: number
        }
        Relationships: [
          {
            foreignKeyName: "measure_rows_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "measure_models"
            referencedColumns: ["id"]
          },
        ]
      }
      media_gallery: {
        Row: {
          created_at: string
          id: string
          name: string | null
          size: number | null
          type: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          size?: number | null
          type: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          size?: number | null
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          currency: string
          id: string
          image: string | null
          name: string
          price: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          image?: string | null
          name: string
          price?: string
          updated_at?: string
          url?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          image?: string | null
          name?: string
          price?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          has_seen_onboarding: boolean | null
          id: string
          initials: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          has_seen_onboarding?: boolean | null
          id: string
          initials?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          has_seen_onboarding?: boolean | null
          id?: string
          initials?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          active: boolean
          created_at: string
          domain: string | null
          id: string
          name: string
          store_id: string
          theme: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          store_id: string
          theme?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          store_id?: string
          theme?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          active: boolean
          aparencia: string
          app_id: string | null
          appearance_preset_id: string | null
          cover_type: string | null
          cover_url: string | null
          created_at: string
          cta: string | null
          format: string
          id: string
          scroll: string
          store_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          urls: Json
          user_id: string
          views: number
        }
        Insert: {
          active?: boolean
          aparencia?: string
          app_id?: string | null
          appearance_preset_id?: string | null
          cover_type?: string | null
          cover_url?: string | null
          created_at?: string
          cta?: string | null
          format?: string
          id?: string
          scroll?: string
          store_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          urls?: Json
          user_id: string
          views?: number
        }
        Update: {
          active?: boolean
          aparencia?: string
          app_id?: string | null
          appearance_preset_id?: string | null
          cover_type?: string | null
          cover_url?: string | null
          created_at?: string
          cta?: string | null
          format?: string
          id?: string
          scroll?: string
          store_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          urls?: Json
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "stories_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "installed_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_appearance_preset_id_fkey"
            columns: ["appearance_preset_id"]
            isOneToOne: false
            referencedRelation: "appearance_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      story_media: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          measure_id: string | null
          name: string | null
          position: number
          product_ids: string[]
          products_layout: string
          story_id: string
          type: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          measure_id?: string | null
          name?: string | null
          position?: number
          product_ids?: string[]
          products_layout?: string
          story_id: string
          type: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          measure_id?: string | null
          name?: string | null
          position?: number
          product_ids?: string[]
          products_layout?: string
          story_id?: string
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_media_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          price: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          price?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          price?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upload_session_files: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          mime_type: string
          session_id: string
          size: number
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          mime_type: string
          session_id: string
          size: number
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string
          session_id?: string
          size?: number
        }
        Relationships: [
          {
            foreignKeyName: "upload_session_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "upload_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_sessions: {
        Row: {
          app_id: string | null
          created_at: string
          expires_at: string
          id: string
          status: string
          token: string
          user_id: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          status?: string
          token: string
          user_id: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "installed_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          referrer: string | null
          session_id: string | null
          store_id: string
          story_id: string | null
          url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          store_id: string
          story_id?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          store_id?: string
          story_id?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_store_id: { Args: never; Returns: string }
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
