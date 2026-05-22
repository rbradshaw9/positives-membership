/**
 * app/admin/coaching/coaches/new/page.tsx
 * Admin: create a new coach profile.
 */

import { requireAdmin } from "@/lib/auth/require-admin";
import { CoachForm } from "../CoachForm";

export const metadata = {
  title: "New Coach — Admin",
};

export default async function NewCoachPage() {
  await requireAdmin();
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">New Coach</h1>
          <p className="admin-page-header__subtitle">Add a new coach profile to the platform.</p>
        </div>
      </div>
      <CoachForm />
    </div>
  );
}
