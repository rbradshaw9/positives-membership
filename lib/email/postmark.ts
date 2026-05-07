export type PostmarkEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  tag: string;
  idempotencyKey?: string;
};

export type PostmarkEmailResult = {
  messageId: string | null;
};

export async function sendPostmarkEmail(input: PostmarkEmailInput): Promise<PostmarkEmailResult> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error("POSTMARK_SERVER_TOKEN is not configured.");

  const from = process.env.POSTMARK_FROM_EMAIL ?? "Positives <test@positives.life>";
  const replyTo = process.env.POSTMARK_REPLY_TO_EMAIL ?? "support@positives.life";
  const messageStream = process.env.POSTMARK_MESSAGE_STREAM ?? "outbound";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-Postmark-Server-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        From: from,
        To: input.to,
        ReplyTo: replyTo,
        Subject: input.subject,
        HtmlBody: input.html,
        TextBody: input.text,
        MessageStream: messageStream,
        Tag: input.tag,
        TrackOpens: false,
        TrackLinks: "None",
      }),
    });

    const detail = await response.text();
    if (!response.ok) {
      throw new Error(`Postmark send failed: ${response.status} ${detail.slice(0, 500)}`);
    }

    let parsed: unknown;
    try {
      parsed = detail ? JSON.parse(detail) : null;
    } catch {
      parsed = null;
    }
    const messageId =
      parsed && typeof parsed === "object" && "MessageID" in parsed
        ? String((parsed as { MessageID?: unknown }).MessageID ?? "")
        : null;

    return { messageId: messageId || null };
  } finally {
    clearTimeout(timeout);
  }
}
