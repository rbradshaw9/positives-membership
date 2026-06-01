export type ZoomScopeRequirement = {
  key: string;
  label: string;
  acceptedScopes: readonly string[];
  setupScope: string;
};

export const ZOOM_REQUIRED_SCOPE_GROUPS = [
  {
    key: "userRead",
    label: "User read",
    setupScope: "user:read:user",
    acceptedScopes: ["user:read:user", "user:read:user:admin", "user:read", "user:read:admin"],
  },
  {
    key: "meetingList",
    label: "Meeting list",
    setupScope: "meeting:read:list_meetings",
    acceptedScopes: [
      "meeting:read:list_meetings",
      "meeting:read:list_meetings:admin",
      "meeting:read",
      "meeting:read:admin",
    ],
  },
  {
    key: "meetingCreate",
    label: "Meeting create",
    setupScope: "meeting:write:meeting",
    acceptedScopes: ["meeting:write:meeting", "meeting:write:meeting:admin", "meeting:write", "meeting:write:admin"],
  },
  {
    key: "meetingUpdate",
    label: "Meeting update",
    setupScope: "meeting:update:meeting",
    acceptedScopes: ["meeting:update:meeting", "meeting:update:meeting:admin", "meeting:write", "meeting:write:admin"],
  },
  {
    key: "meetingDelete",
    label: "Meeting delete",
    setupScope: "meeting:delete:meeting",
    acceptedScopes: ["meeting:delete:meeting", "meeting:delete:meeting:admin"],
  },
  {
    key: "webinarList",
    label: "Webinar list",
    setupScope: "webinar:read:list_webinars",
    acceptedScopes: [
      "webinar:read:list_webinars",
      "webinar:read:list_webinars:admin",
      "webinar:read",
      "webinar:read:admin",
    ],
  },
  {
    key: "webinarCreate",
    label: "Webinar create",
    setupScope: "webinar:write:webinar",
    acceptedScopes: ["webinar:write:webinar", "webinar:write:webinar:admin", "webinar:write", "webinar:write:admin"],
  },
  {
    key: "webinarUpdate",
    label: "Webinar update",
    setupScope: "webinar:update:webinar",
    acceptedScopes: ["webinar:update:webinar", "webinar:update:webinar:admin", "webinar:write", "webinar:write:admin"],
  },
  {
    key: "webinarDelete",
    label: "Webinar delete",
    setupScope: "webinar:delete:webinar",
    acceptedScopes: ["webinar:delete:webinar", "webinar:delete:webinar:admin"],
  },
] as const satisfies readonly ZoomScopeRequirement[];

export function hasAnyZoomScope(scopes: string[] | null | undefined, acceptedScopes: readonly string[]) {
  const granted = new Set(scopes ?? []);
  return acceptedScopes.some((scope) => granted.has(scope));
}

export function missingZoomScopeRequirements(scopes: string[] | null | undefined) {
  return ZOOM_REQUIRED_SCOPE_GROUPS.filter((requirement) => !hasAnyZoomScope(scopes, requirement.acceptedScopes));
}
