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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_event: {
        Row: {
          content_id: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id: string
          member_id: string
          metadata: Json | null
          occurred_at: string
        }
        Insert: {
          content_id?: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          member_id: string
          metadata?: Json | null
          occurred_at?: string
        }
        Update: {
          content_id?: string | null
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          member_id?: string
          metadata?: Json | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_event_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_event_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_link: {
        Row: {
          clicks: number
          code: string
          created_at: string
          destination: string | null
          id: string
          label: string
          member_id: string
          token: string
        }
        Insert: {
          clicks?: number
          code: string
          created_at?: string
          destination?: string | null
          id?: string
          label: string
          member_id: string
          token: string
        }
        Update: {
          clicks?: number
          code?: string
          created_at?: string
          destination?: string | null
          id?: string
          label?: string
          member_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_link_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post: {
        Row: {
          body: string
          content_id: string | null
          created_at: string
          id: string
          is_admin_answer: boolean
          is_pinned: boolean
          member_id: string
          parent_id: string | null
          post_type: Database["public"]["Enums"]["community_post_type"]
        }
        Insert: {
          body: string
          content_id?: string | null
          created_at?: string
          id?: string
          is_admin_answer?: boolean
          is_pinned?: boolean
          member_id: string
          parent_id?: string | null
          post_type?: Database["public"]["Enums"]["community_post_type"]
        }
        Update: {
          body?: string
          content_id?: string | null
          created_at?: string
          id?: string
          is_admin_answer?: boolean
          is_pinned?: boolean
          member_id?: string
          parent_id?: string | null
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
          {
            foreignKeyName: "community_post_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_post"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_like: {
        Row: {
          created_at: string
          id: string
          member_id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_like_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_like_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_post"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          admin_notes: string | null
          ai_generated_description: string | null
          ai_generated_title: string | null
          body: string | null
          castos_episode_url: string | null
          created_at: string
          description: string | null
          download_url: string | null
          duration_seconds: number | null
          excerpt: string | null
          id: string
          is_active: boolean
          is_today_override: boolean
          join_url: string | null
          month_theme: string | null
          month_year: string | null
          monthly_practice_id: string | null
          mux_asset_id: string | null
          mux_playback_id: string | null
          publish_date: string | null
          published_at: string | null
          reflection_prompt: string | null
          resource_links: Json
          s3_audio_key: string | null
          search_vector: unknown
          source: Database["public"]["Enums"]["content_source"]
          source_ref: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          tier_min: Database["public"]["Enums"]["subscription_tier"] | null
          title: string
          transcription: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          vimeo_video_id: string | null
          week_start: string | null
          youtube_video_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          ai_generated_description?: string | null
          ai_generated_title?: string | null
          body?: string | null
          castos_episode_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          excerpt?: string | null
          id?: string
          is_active?: boolean
          is_today_override?: boolean
          join_url?: string | null
          month_theme?: string | null
          month_year?: string | null
          monthly_practice_id?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          publish_date?: string | null
          published_at?: string | null
          reflection_prompt?: string | null
          resource_links?: Json
          s3_audio_key?: string | null
          search_vector?: unknown
          source?: Database["public"]["Enums"]["content_source"]
          source_ref?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          tier_min?: Database["public"]["Enums"]["subscription_tier"] | null
          title: string
          transcription?: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          vimeo_video_id?: string | null
          week_start?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          ai_generated_description?: string | null
          ai_generated_title?: string | null
          body?: string | null
          castos_episode_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          excerpt?: string | null
          id?: string
          is_active?: boolean
          is_today_override?: boolean
          join_url?: string | null
          month_theme?: string | null
          month_year?: string | null
          monthly_practice_id?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          publish_date?: string | null
          published_at?: string | null
          reflection_prompt?: string | null
          resource_links?: Json
          s3_audio_key?: string | null
          search_vector?: unknown
          source?: Database["public"]["Enums"]["content_source"]
          source_ref?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          tier_min?: Database["public"]["Enums"]["subscription_tier"] | null
          title?: string
          transcription?: string | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          vimeo_video_id?: string | null
          week_start?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_monthly_practice_id_fkey"
            columns: ["monthly_practice_id"]
            isOneToOne: false
            referencedRelation: "monthly_practice"
            referencedColumns: ["id"]
          },
        ]
      }
      content_chunk: {
        Row: {
          chunk_index: number
          chunk_text: string
          content_id: string
          created_at: string
          embedding: string | null
          id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          content_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          content_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_chunk_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_embedding: {
        Row: {
          content_id: string
          embedded_at: string
          embedding: string | null
          model: string
        }
        Insert: {
          content_id: string
          embedded_at?: string
          embedding?: string | null
          model?: string
        }
        Update: {
          content_id?: string
          embedded_at?: string
          embedding?: string | null
          model?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_embedding_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      course: {
        Row: {
          admin_notes: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_standalone_purchasable: boolean
          price_cents: number | null
          slug: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          stripe_price_id: string | null
          stripe_product_id: string | null
          tier_min: Database["public"]["Enums"]["subscription_tier"] | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_standalone_purchasable?: boolean
          price_cents?: number | null
          slug?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier_min?: Database["public"]["Enums"]["subscription_tier"] | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_standalone_purchasable?: boolean
          price_cents?: number | null
          slug?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier_min?: Database["public"]["Enums"]["subscription_tier"] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_lesson: {
        Row: {
          body: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          module_id: string
          resources: string | null
          sort_order: number
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          module_id: string
          resources?: string | null
          sort_order?: number
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          module_id?: string
          resources?: string | null
          sort_order?: number
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_module"
            referencedColumns: ["id"]
          },
        ]
      }
      course_module: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_module_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          auto_completed: boolean
          completed: boolean
          completed_at: string | null
          course_id: string
          course_lesson_id: string | null
          course_session_id: string | null
          created_at: string | null
          id: string
          member_id: string
          updated_at: string | null
          video_watch_percent: number
        }
        Insert: {
          auto_completed?: boolean
          completed?: boolean
          completed_at?: string | null
          course_id: string
          course_lesson_id?: string | null
          course_session_id?: string | null
          created_at?: string | null
          id?: string
          member_id: string
          updated_at?: string | null
          video_watch_percent?: number
        }
        Update: {
          auto_completed?: boolean
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          course_lesson_id?: string | null
          course_session_id?: string | null
          created_at?: string | null
          id?: string
          member_id?: string
          updated_at?: string | null
          video_watch_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_course_lesson_id_fkey"
            columns: ["course_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lesson"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_course_session_id_fkey"
            columns: ["course_session_id"]
            isOneToOne: false
            referencedRelation: "course_session"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      course_session: {
        Row: {
          body: string | null
          content_id: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          lesson_id: string | null
          module_id: string
          mux_playback_id: string | null
          resources: string | null
          sort_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          body?: string | null
          content_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          lesson_id?: string | null
          module_id: string
          mux_playback_id?: string | null
          resources?: string | null
          sort_order?: number
          title: string
          video_url?: string | null
        }
        Update: {
          body?: string | null
          content_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          lesson_id?: string | null
          module_id?: string
          mux_playback_id?: string | null
          resources?: string | null
          sort_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_session_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_session_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lesson"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_session_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_module"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template: {
        Row: {
          body: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          day_offset: number
          heading: string
          id: string
          is_active: boolean
          name: string
          send_at_utc_hour: number | null
          sequence: string
          slug: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          day_offset?: number
          heading?: string
          id?: string
          is_active?: boolean
          name: string
          send_at_utc_hour?: number | null
          sequence: string
          slug: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          day_offset?: number
          heading?: string
          id?: string
          is_active?: boolean
          name?: string
          send_at_utc_hour?: number | null
          sequence?: string
          slug?: string
          subject?: string
          updated_at?: string
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
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          entry_text: string
          id?: string
          member_id: string
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          entry_text?: string
          id?: string
          member_id?: string
          updated_at?: string
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
          email_unsubscribed: boolean
          id: string
          last_practiced_at: string | null
          fp_promoter_id: number | null
          fp_ref_id: string | null
          name: string | null
          onboarding_token: string | null
          password_set: boolean
          paypal_email: string | null
          practice_streak: number
          referred_by_fpr: string | null
          affiliate_id: string | null
          affiliate_token: string | null
          referral_id: string | null
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          timezone: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          email_unsubscribed?: boolean
          fp_promoter_id?: number | null
          fp_ref_id?: string | null
          id: string
          last_practiced_at?: string | null
          name?: string | null
          onboarding_token?: string | null
          password_set?: boolean
          paypal_email?: string | null
          practice_streak?: number
          referred_by_fpr?: string | null
          affiliate_id?: string | null
          affiliate_token?: string | null
          referral_id?: string | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          timezone?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          email_unsubscribed?: boolean
          fp_promoter_id?: number | null
          fp_ref_id?: string | null
          id?: string
          last_practiced_at?: string | null
          name?: string | null
          onboarding_token?: string | null
          password_set?: boolean
          paypal_email?: string | null
          practice_streak?: number
          referred_by_fpr?: string | null
          affiliate_id?: string | null
          affiliate_token?: string | null
          referral_id?: string | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          timezone?: string
        }
        Relationships: []
      }
      member_w9: {
        Row: {
          address: string
          business_name: string | null
          city: string
          created_at: string
          id: string
          legal_name: string
          member_id: string
          signature_name: string
          signed_at: string
          state_code: string
          tax_classification: string
          tax_id: string
          zip: string
        }
        Insert: {
          address: string
          business_name?: string | null
          city: string
          created_at?: string
          id?: string
          legal_name: string
          member_id: string
          signature_name: string
          signed_at?: string
          state_code: string
          tax_classification: string
          tax_id: string
          zip: string
        }
        Update: {
          address?: string
          business_name?: string | null
          city?: string
          created_at?: string
          id?: string
          legal_name?: string
          member_id?: string
          signature_name?: string
          signed_at?: string
          state_code?: string
          tax_classification?: string
          tax_id?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_w9_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_practice: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: string
          label: string
          month_year: string
          status: Database["public"]["Enums"]["content_status"] | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          month_year: string
          status?: Database["public"]["Enums"]["content_status"] | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          month_year?: string
          status?: Database["public"]["Enums"]["content_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      onboarding_sequence: {
        Row: {
          created_at: string
          day: number
          email: string
          error_message: string | null
          failed: boolean
          id: string
          member_id: string
          send_at: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          day: number
          email: string
          error_message?: string | null
          failed?: boolean
          id?: string
          member_id: string
          send_at: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          day?: number
          email?: string
          error_message?: string | null
          failed?: boolean
          id?: string
          member_id?: string
          send_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sequence_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_recovery_sequence: {
        Row: {
          created_at: string
          day: number
          email: string
          error_message: string | null
          failed: boolean
          id: string
          member_id: string
          send_at: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          day: number
          email: string
          error_message?: string | null
          failed?: boolean
          id?: string
          member_id: string
          send_at: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          day?: number
          email?: string
          error_message?: string | null
          failed?: boolean
          id?: string
          member_id?: string
          send_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_recovery_sequence_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
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
      support_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          member_id: string | null
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          member_id?: string | null
          message: string
          name: string
          subject?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          member_id?: string | null
          message?: string
          name?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_submissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      video_views: {
        Row: {
          completed: boolean
          content_id: string | null
          course_lesson_id: string | null
          id: string
          last_seen_at: string
          mux_asset_id: string | null
          mux_playback_id: string | null
          resume_at_seconds: number
          session_count: number
          started_at: string
          user_id: string
          watch_percent: number
        }
        Insert: {
          completed?: boolean
          content_id?: string | null
          course_lesson_id?: string | null
          id?: string
          last_seen_at?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          resume_at_seconds?: number
          session_count?: number
          started_at?: string
          user_id: string
          watch_percent?: number
        }
        Update: {
          completed?: boolean
          content_id?: string | null
          course_lesson_id?: string | null
          id?: string
          last_seen_at?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          resume_at_seconds?: number
          session_count?: number
          started_at?: string
          user_id?: string
          watch_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_views_course_lesson_id_fkey"
            columns: ["course_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lesson"
            referencedColumns: ["id"]
          },
        ]
      }
      winback_sequence: {
        Row: {
          created_at: string
          day: number
          email: string
          error_message: string | null
          failed: boolean
          id: string
          member_id: string
          send_at: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          day: number
          email: string
          error_message?: string | null
          failed?: boolean
          id?: string
          member_id: string
          send_at: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          day?: number
          email?: string
          error_message?: string | null
          failed?: boolean
          id?: string
          member_id?: string
          send_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "winback_sequence_member_id_fkey"
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
      activity_event_type:
        | "session_start"
        | "daily_listened"
        | "daily_started"
        | "weekly_viewed"
        | "monthly_viewed"
        | "note_created"
        | "note_updated"
        | "journal_opened"
        | "event_attended"
        | "qa_submitted"
        | "qa_viewed"
        | "milestone_reached"
        | "upgrade_prompt_seen"
        | "upgrade_clicked"
        | "coaching_attended"
      community_post_type: "reflection" | "question" | "share"
      content_source: "gdrive" | "vimeo" | "admin"
      content_status: "draft" | "ready_for_review" | "published" | "archived"
      content_type:
        | "daily_audio"
        | "weekly_principle"
        | "monthly_theme"
        | "library"
        | "workshop"
        | "coaching_call"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_event_type: [
        "session_start",
        "daily_listened",
        "daily_started",
        "weekly_viewed",
        "monthly_viewed",
        "note_created",
        "note_updated",
        "journal_opened",
        "event_attended",
        "qa_submitted",
        "qa_viewed",
        "milestone_reached",
        "upgrade_prompt_seen",
        "upgrade_clicked",
        "coaching_attended",
      ],
      community_post_type: ["reflection", "question", "share"],
      content_source: ["gdrive", "vimeo", "admin"],
      content_status: ["draft", "ready_for_review", "published", "archived"],
      content_type: [
        "daily_audio",
        "weekly_principle",
        "monthly_theme",
        "library",
        "workshop",
        "coaching_call",
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
