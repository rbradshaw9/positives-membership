import { redirect } from "next/navigation";

/**
 * app/subscribe/page.tsx
 *
 * /subscribe is no longer the primary conversion surface.
 * The /join page now handles pricing, auth, and checkout entry.
 *
 * This redirect preserves backwards compatibility for any existing
 * links or bookmarks pointing to /subscribe.
 */
export default function SubscribePage() {
  redirect("/join");
}
