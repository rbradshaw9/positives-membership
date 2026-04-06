import { redirect } from "next/navigation";

/**
 * /contact → /support redirect
 * Keeps the URL discoverable but consolidates the support page.
 */
export default function ContactPage() {
  redirect("/support");
}
