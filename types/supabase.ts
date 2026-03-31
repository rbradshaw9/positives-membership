// AUTO-GENERATED — do not edit manually.
// Regenerate with: npx supabase gen types typescript --project-id qdnojizzldilqpyocora > types/supabase.ts
// Last generated: 2026-03-31 from live project qdnojizzldilqpyocora

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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      community_post: {
        Row: {
          body: string
          content_id: string | null
          created_at: string
          id: string
          member_id: string
          post_type: Database["public"]["Enums"]["community_post_type"]
        }
        Insert: {
          body: string
          content_id?: string | null
          created_at?: string
          id?: string
          member_id: string
          post_type?: Database["public"]["Enums"]["community_post_type"]
        }
        Update: {
          body?: string
          content_id?: string | null
          created_at?: string
          id?: string
          member_id?: string
          post_type?: Database["public"]["Enums"]["community_post_type"]
        }
        Relationships: [
          {
            foreignKeyName: "community_post_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          ai_generated_description: string | null
          ai_generated_title: string | null
          castos_episode_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_active: boolean
          month_theme: string | null
          published_at: string | null
          s3_audio_key: string | null
          tags: string[]
          title: string
          transcription: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          vimeo_video_id: string | null
        }
        Insert: {
          ai_generated_description?: string | null
          ai_generated_title?: string | null
          castos_episode_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          month_theme?: string | null
          published_at?: string | null
          s3_audio_key?: string | null
          tags?: string[]
          title: string
          transcription?: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          vimeo_video_id?: string | null
        }
        Update: {
          ai_generated_description?: string | null
          ai_generated_title?: string | null
          castos_episode_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          month_theme?: string | null
          published_at?: string | null
          s3_audio_key?: string | null
          tags?: string[]
          title?: string
          transcription?: string | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          vimeo_video_id?: string | null
        }
        Relationships: []
      }
      journal: {
        Row: {
          content_id: string | null
          created_at: string
          entry_text: string
          id: string
          member_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          entry_text: string
          id?: string
          member_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          entry_text?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      member: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          last_practiced_at: string | null
          name: string | null
          onboarding_token: string | null
          password_set: boolean
          practice_streak: number
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          last_practiced_at?: string | null
          name?: string | null
          onboarding_token?: string | null
          password_set?: boolean
          practice_streak?: number
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          last_practiced_at?: string | null
          name?: string | null
          onboarding_token?: string | null
          password_set?: boolean
          practice_streak?: number
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
        }
        Relationships: []
      }
      progress: {
        Row: {
          completed: boolean
          content_id: string
          id: string
          listened_at: string
          member_id: string
          reflection_text: string | null
        }
        Insert: {
          completed?: boolean
          content_id: string
          id?: string
          listened_at?: string
          member_id: string
          reflection_text?: string | null
        }
        Update: {
          completed?: boolean
          content_id?: string
          id?: string
          listened_at?: string
          member_id?: string
          reflection_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
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
      community_post_type: "reflection" | "question" | "share"
      content_type:
        | "daily_audio"
        | "weekly_principle"
        | "monthly_theme"
        | "library"
        | "workshop"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "trialing"
        | "inactive"
      subscription_tier: "level_1" | "level_2" | "level_3" | "level_4"
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
    Enums: {
      community_post_type: ["reflection", "question", "share"],
      content_type: [
        "daily_audio",
        "weekly_principle",
        "monthly_theme",
        "library",
        "workshop",
      ],
      subscription_status: [
        "active",
        "past_due",
        "canceled",
        "trialing",
        "inactive",
      ],
      subscription_tier: ["level_1", "level_2", "level_3", "level_4"],
    },
  },
} as const
