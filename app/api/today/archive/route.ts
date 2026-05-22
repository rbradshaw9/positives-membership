import { getEffectiveDate, getEffectiveMonthYear } from "@/lib/dates/effective-date";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMonthlyDailyAudios } from "@/lib/queries/get-monthly-daily-audios";
import { getMonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { getAdminClient } from "@/lib/supabase/admin";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";

export async function GET() {
  const member = await requireActiveMember();
  const effectiveDateStr = getEffectiveDate();
  const effectiveMonthYear = getEffectiveMonthYear();

  const [rawMonthGroups, rawMonthWeekly] = await Promise.all([
    getMonthlyDailyAudios(effectiveDateStr),
    getMonthWeeklyContent(effectiveMonthYear),
  ]);

  const [monthGroups, monthWeekly] = await Promise.all([
    Promise.all(
      rawMonthGroups.map(async (group) => ({
        ...group,
        audios: await Promise.all(
          group.audios.map(async (audio) => ({
            ...audio,
            audio_url: await resolveAudioUrl(audio.castos_episode_url, audio.s3_audio_key),
          }))
        ),
      }))
    ),
    Promise.all(
      rawMonthWeekly.map(async (week) => ({
        ...week,
        audio_url: await resolveAudioUrl(week.castos_episode_url, week.s3_audio_key),
      }))
    ),
  ]);

  const archiveContentIds = monthGroups.flatMap((group) => group.audios.map((audio) => audio.id));
  const listenedContentIds =
    archiveContentIds.length > 0
      ? await getAdminClient()
          .from("activity_event")
          .select("content_id")
          .eq("member_id", member.id)
          .eq("event_type", "daily_listened")
          .in("content_id", archiveContentIds)
          .then(({ data }) =>
            (data ?? [])
              .map((row) => row.content_id)
              .filter((contentId): contentId is string => Boolean(contentId))
          )
      : [];

  return Response.json({
    monthGroups,
    monthWeekly,
    listenedContentIds,
  });
}
