/**
 * app/api/podcast/[token]/route.ts
 *
 * GET /api/podcast/{podcast_token}
 *
 * Private RSS 2.0 podcast feed for a single member.
 * Authentication is the token itself — keep the URL private.
 *
 * Returns all published daily_audio content the member has access to,
 * ordered newest first (standard podcast app convention).
 *
 * Podcast apps call this URL on a schedule (hourly–daily) to check for
 * new episodes. No session cookie required — the token IS the auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { generatePodcastFeed } from "@/lib/podcast/generate-feed";
import { config } from "@/lib/config";

type MemberRow = {
  id: string;
  name: string | null;
  email: string;
  subscription_status: string | null;
};

type ContentRow = {
  id: string;
  title: string;
  description: string | null;
  castos_episode_url: string | null;
  s3_audio_key: string | null;
  publish_date: string;
  duration_seconds: number | null;
};

function buildAudioUrl(row: ContentRow): string | null {
  if (row.castos_episode_url) return row.castos_episode_url;
  if (row.s3_audio_key) {
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    if (bucket && region) {
      return `https://${bucket}.s3.${region}.amazonaws.com/${row.s3_audio_key}`;
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = asLooseSupabaseClient(getAdminClient());

  // Look up member by their podcast token
  const { data: member, error: memberError } = await supabase
    .from("member")
    .select<MemberRow>("id, name, email, subscription_status")
    .eq("podcast_token", token)
    .maybeSingle();

  if (memberError || !member) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Verify membership is active — inactive members lose podcast access
  // (but we still return a valid empty feed rather than a 403 so the app
  //  doesn't show an error — they just see no episodes until they resubscribe)
  const isActive = hasActiveMemberAccess(
    member.subscription_status as Parameters<typeof hasActiveMemberAccess>[0]
  );

  if (!isActive) {
    // Check platform_access bypass for staff
    const { data: staffAccess } = await supabase
      .from("admin_user_role")
      .select<{ platform_access: boolean }[]>("platform_access")
      .eq("member_id", member.id)
      .eq("platform_access", true)
      .limit(1);

    if (!staffAccess?.length) {
      // Return empty feed (not 403) — better UX for lapsed members in podcast apps
      const emptyFeed = generatePodcastFeed([], {
        memberName: member.name ?? member.email,
        feedUrl: `${config.app.url}/api/podcast/${token}`,
        appUrl: config.app.url,
      });
      return new NextResponse(emptyFeed, {
        status: 200,
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  // Fetch all published daily audio up to today
  const today = new Date().toISOString().split("T")[0];
  const { data: contentRows } = await supabase
    .from("content")
    .select<ContentRow[]>(
      "id, title, description, castos_episode_url, s3_audio_key, publish_date, duration_seconds"
    )
    .eq("type", "daily_audio")
    .eq("status", "published")
    .lte("publish_date", today)
    .order("publish_date", { ascending: false })
    .limit(100); // last ~3 months of daily audio

  const episodes = (contentRows ?? [])
    .map((row) => {
      const audioUrl = buildAudioUrl(row);
      if (!audioUrl) return null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        audioUrl,
        publishDate: row.publish_date,
        durationSeconds: row.duration_seconds,
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof buildAudioUrl> extends null ? never : {
      id: string; title: string; description: string | null;
      audioUrl: string; publishDate: string; durationSeconds: number | null;
    }>[];

  const feed = generatePodcastFeed(episodes, {
    memberName: member.name ?? member.email,
    feedUrl: `${config.app.url}/api/podcast/${token}`,
    appUrl: config.app.url,
  });

  return new NextResponse(feed, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Cache for 1 hour — podcast apps poll frequently
      "Cache-Control": "private, max-age=3600",
    },
  });
}
