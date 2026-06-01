export const MEMBER_ONBOARDING_TOUR_KEY = "member-core-v1";

export type MemberTourStep = {
  id: string;
  path: string;
  target: string;
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
};

export type MemberTourStatus = "not_started" | "started" | "dismissed" | "completed";

export const MEMBER_ONBOARDING_TOUR_STEPS = [
  {
    id: "today-rhythm",
    path: "/today",
    target: "today-overview",
    eyebrow: "Your home base",
    title: "Start with Today",
    body: "This page keeps the next step simple. You will see today's practice first, with the weekly and monthly context close by.",
  },
  {
    id: "daily-practice",
    path: "/today",
    target: "today-daily-practice",
    eyebrow: "Daily",
    title: "Listen to today's practice",
    body: "The daily audio is the center of Positives. Listen when you are ready, then save a reflection if something feels worth remembering.",
  },
  {
    id: "weekly-principle",
    path: "/today",
    target: "today-weekly-principle",
    eyebrow: "Weekly",
    title: "Let the weekly principle support the habit",
    body: "Each week adds one practical idea to carry into daily life. Come back to it when you want a little more depth.",
  },
  {
    id: "monthly-theme",
    path: "/today",
    target: "today-monthly-theme",
    eyebrow: "Monthly",
    title: "Use the monthly theme as your frame",
    body: "The month gives the practice a steady direction. It is here for context, not as something you need to complete.",
  },
  {
    id: "practice-history",
    path: "/today",
    target: "member-nav-practice",
    eyebrow: "Your history",
    title: "My Practice shows your rhythm",
    body: "Use My Practice to revisit listening history, reflections, and recent activity. It is a record, not a scorecard.",
  },
  {
    id: "account-menu",
    path: "/today",
    target: "member-profile-menu",
    eyebrow: "Account",
    title: "Your profile menu opens account tools",
    body: "Profile, billing, password, timezone, coaching, and affiliate access live under Account so the daily practice stays uncluttered.",
    actionLabel: "Open account",
  },
  {
    id: "billing-settings",
    path: "/account",
    target: "account-membership-billing",
    eyebrow: "Account management",
    title: "Manage membership and billing here",
    body: "This section shows your plan, access, renewal details, and secure Stripe billing center access.",
  },
  {
    id: "affiliate-entry",
    path: "/account",
    target: "account-affiliate-program",
    eyebrow: "Affiliate links",
    title: "Open the affiliate portal from Account",
    body: "If you are an affiliate, this is the path to your referral link, share kit, performance, and payout details.",
    actionLabel: "Open affiliate portal",
  },
  {
    id: "affiliate-portal",
    path: "/account/affiliate",
    target: "affiliate-portal-primary",
    eyebrow: "Share Positives",
    title: "Get your referral link here",
    body: "The portal gives you a simple referral link, optional tracking tags, share templates, and earnings reporting when referrals come in.",
  },
  {
    id: "relaunch-tour",
    path: "/today",
    target: "member-profile-menu",
    eyebrow: "Come back anytime",
    title: "You can restart this tour later",
    body: "Open the profile menu and choose Take the tour whenever you want a quick refresher.",
  },
] satisfies MemberTourStep[];

export const MEMBER_ONBOARDING_TOUR_STEP_IDS = MEMBER_ONBOARDING_TOUR_STEPS.map(
  (step) => step.id
);
