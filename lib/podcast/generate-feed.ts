/**
 * lib/podcast/generate-feed.ts
 * Generates a valid RSS 2.0 + iTunes podcast feed for a single member.
 * The feed is private — authenticated via the member's podcast_token in the URL.
 */

export type PodcastEpisode = {
  id: string;
  title: string;
  description: string | null;
  audioUrl: string;
  publishDate: string; // ISO date string (YYYY-MM-DD)
  durationSeconds: number | null;
};

type FeedOptions = {
  memberName: string;
  feedUrl: string; // full URL to this feed (used for self-link)
  appUrl: string;
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc2822Date(isoDate: string): string {
  // Convert YYYY-MM-DD to RFC 2822 format for RSS pubDate
  // Use noon UTC to avoid timezone edge cases
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toUTCString();
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function generatePodcastFeed(
  episodes: PodcastEpisode[],
  opts: FeedOptions
): string {
  const { memberName, feedUrl, appUrl } = opts;
  const artworkUrl = `${appUrl}/apple-icon.png`;
  const feedTitle = escapeXml(`Positives Daily Practice — ${memberName}`);
  const feedDescription = escapeXml(
    "Your personal daily practice feed. Each session is a short, grounding audio with Dr. Paul Jenkins."
  );

  const items = episodes
    .map((ep) => {
      const title = escapeXml(ep.title);
      const desc = escapeXml(ep.description ?? ep.title);
      const guid = `${appUrl}/practice/${ep.publishDate}/${ep.id}`;
      const pubDate = rfc2822Date(ep.publishDate);
      const duration = formatDuration(ep.durationSeconds);

      return `    <item>
      <title>${title}</title>
      <description><![CDATA[${ep.description ?? ep.title}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <enclosure url="${escapeXml(ep.audioUrl)}" type="audio/mpeg" length="0"/>
      <itunes:title>${title}</itunes:title>
      <itunes:summary><![CDATA[${ep.description ?? ep.title}]]></itunes:summary>
      <itunes:duration>${duration}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${feedTitle}</title>
    <link>${escapeXml(appUrl)}</link>
    <description>${feedDescription}</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${escapeXml(artworkUrl)}</url>
      <title>${feedTitle}</title>
      <link>${escapeXml(appUrl)}</link>
    </image>
    <itunes:author>Dr. Paul Jenkins</itunes:author>
    <itunes:summary>${feedDescription}</itunes:summary>
    <itunes:image href="${escapeXml(artworkUrl)}"/>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Health &amp; Fitness">
      <itunes:category text="Mental Health"/>
    </itunes:category>
    <itunes:owner>
      <itunes:name>Positives</itunes:name>
      <itunes:email>support@positives.life</itunes:email>
    </itunes:owner>
${items}
  </channel>
</rss>`;
}
