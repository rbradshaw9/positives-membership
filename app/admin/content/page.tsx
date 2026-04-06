import { redirect } from "next/navigation";

/**
 * app/admin/content/page.tsx
 * Content Library has been consolidated into Monthly Setup.
 * This page redirects to the month workspace list.
 */
export default function AdminContentPage() {
  redirect("/admin/months");
}
