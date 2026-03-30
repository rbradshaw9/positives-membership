/**
 * types/supabase.ts
 * Database type definitions for use with Supabase clients.
 *
 * This file is a manually maintained scaffold matching the v1 schema.
 * Run `npx supabase gen types typescript` to auto-generate when connected
 * to a live Supabase project.
 */

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "inactive";

export type SubscriptionTier =
  | "level_1"
  | "level_2"
  | "level_3"
  | "level_4"
  | null;

export type ContentType =
  | "daily_audio"
  | "weekly_principle"
  | "monthly_theme"
  | "library"
  | "workshop";

export type CommunityPostType = "reflection" | "question" | "share";

export interface Member {
  id: string; // = auth.uid()
  email: string;
  name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier;
  subscription_end_date: string | null; // ISO timestamp
  practice_streak: number;
  last_practiced_at: string | null; // ISO timestamp
  created_at: string;
}

export interface Content {
  id: string;
  title: string;
  description: string | null;
  type: ContentType;
  vimeo_video_id: string | null;
  s3_audio_key: string | null;
  castos_episode_url: string | null;
  transcription: string | null;
  ai_generated_title: string | null;
  ai_generated_description: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  month_theme: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Progress {
  id: string;
  member_id: string;
  content_id: string;
  listened_at: string;
  completed: boolean;
  reflection_text: string | null;
}

export interface Journal {
  id: string;
  member_id: string;
  content_id: string | null;
  entry_text: string;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  member_id: string;
  content_id: string | null;
  body: string;
  post_type: CommunityPostType;
  created_at: string;
}

// ─── Supabase Database type map ────────────────────────────────────────────
// Required by @supabase/ssr typed clients.

export type Database = {
  public: {
    Tables: {
      member: {
        Row: Member;
        Insert: Omit<Member, "created_at" | "practice_streak"> & {
          practice_streak?: number;
        };
        Update: Partial<Member>;
      };
      content: {
        Row: Content;
        Insert: Omit<Content, "id" | "created_at" | "updated_at" | "tags"> & {
          id?: string;
          tags?: string[];
        };
        Update: Partial<Content>;
      };
      progress: {
        Row: Progress;
        Insert: Omit<Progress, "id"> & { id?: string };
        Update: Partial<Progress>;
      };
      journal: {
        Row: Journal;
        Insert: Omit<Journal, "id" | "created_at"> & { id?: string };
        Update: Partial<Journal>;
      };
      community_post: {
        Row: CommunityPost;
        Insert: Omit<CommunityPost, "id" | "created_at"> & { id?: string };
        Update: Partial<CommunityPost>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_status: SubscriptionStatus;
      subscription_tier: SubscriptionTier;
      content_type: ContentType;
      community_post_type: CommunityPostType;
    };
  };
};
