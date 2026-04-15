export type AdminPermissionKey =
  | "members.read"
  | "members.update_profile"
  | "members.update_lifecycle"
  | "members.manage_billing"
  | "courses.grant"
  | "courses.revoke"
  | "points.adjust"
  | "notes.write"
  | "documents.write"
  | "roles.manage"
  | "audit.read";

export const ADMIN_PERMISSION_OPTIONS: Array<{
  key: AdminPermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: "members.read",
    label: "Read members",
    description: "View member directory, detail pages, and support context.",
  },
  {
    key: "members.update_profile",
    label: "Update member profile",
    description: "Edit operational fields, follow-up state, assigned coach, and avatars.",
  },
  {
    key: "members.update_lifecycle",
    label: "Update lifecycle",
    description: "Manage non-billing lifecycle corrections and access state.",
  },
  {
    key: "members.manage_billing",
    label: "Manage billing",
    description: "Preview and apply Stripe-backed plan changes.",
  },
  {
    key: "courses.grant",
    label: "Grant courses",
    description: "Give a member permanent course access.",
  },
  {
    key: "courses.revoke",
    label: "Revoke courses",
    description: "Remove a course entitlement while preserving history.",
  },
  {
    key: "points.adjust",
    label: "Adjust points",
    description: "Add, remove, or spend member points.",
  },
  {
    key: "notes.write",
    label: "Write notes",
    description: "Add internal support or coaching notes.",
  },
  {
    key: "documents.write",
    label: "Manage documents",
    description: "Upload or link internal member documents.",
  },
  {
    key: "roles.manage",
    label: "Manage roles",
    description: "Assign roles, edit role permissions, and set per-user overrides.",
  },
  {
    key: "audit.read",
    label: "Read audit log",
    description: "View admin mutation history.",
  },
];

export const ADMIN_PERMISSION_KEYS = ADMIN_PERMISSION_OPTIONS.map((option) => option.key);

export function isAdminPermissionKey(value: string): value is AdminPermissionKey {
  return ADMIN_PERMISSION_KEYS.includes(value as AdminPermissionKey);
}

export function getAdminPermissionLabel(permission: string) {
  return ADMIN_PERMISSION_OPTIONS.find((option) => option.key === permission)?.label ?? permission;
}
