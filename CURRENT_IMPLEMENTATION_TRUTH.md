# Current Implementation Truth

> Generated 2026-04-01 from code inspection. Not aspirational — only what exists.

---

## Production-Ready Systems

### Authentication & Access

- **Supabase Auth** — magic link + password login. Fully working.
- **`requireActiveMember()`** — server guard enforcing `subscription_status = 'active'`. Every member page uses it.
- **`requireAdmin()`** — email allowlist guard protecting `/admin`.
- **Auth callback** — `/auth/callback` route handles Supabase OTP exchange.
- **Password nudge** — `PasswordNudgeBanner` prompts magic-link-only members to set a password.

### Stripe Billing

- **Webhook handler** at `/api/webhooks/stripe` — verifies signatures, processes 5 event types.
- **Event handlers** — `checkout.session.completed`, `subscription.created/updated/deleted`, `invoice.payment_failed`.
- **Tier mapping** — canonical `mapTier()` in `handle-subscription.ts` maps 8 env var price IDs → 4 tiers × 2 intervals.
- **Guest checkout** — `create-guest-checkout.ts` for unauthenticated buyers.
- **Billing portal** — Stripe customer portal accessible from `/account`.
- **Join page** — `/join` with monthly/annual toggle, auth gate, check-email screen, value section, guarantee, CTA. **Currently Level 1 pricing only.**

### Today Page

- **Hero section** — radial gradient, time-aware greeting ("Good morning, Ryan"), date label, practice sub-line.
- **DailyPracticeCard** — audio player, 80% completion threshold → `markListened`, "Listened today ✓" chip, note button, resource links.
- **WeeklyPrincipleCard** — video embed (Vimeo/YouTube), optional audio player, markdown body, reflection prompt, note button.
- **MonthlyThemeCard** — video embed, body, note button.
- **Streak display** — in hero (mobile) and MemberTopNav (desktop).
- **"Continue your practice"** — visual separator between daily and weekly/monthly cards.

### Library

- **Full-text search** — FTS with weighted tsvector (title > excerpt > body > transcription).
- **Type filter tabs** — All / Daily / Weekly / Monthly.
- **Pagination** — 20 items/page with Previous/Next.
- **Note indicators** — shows which items have notes.
- **Empty states** — distinct for no results, no search match, end of list.

### Journal / Notes

- **NoteSheet** — slide-over on desktop, bottom sheet on mobile. Opens from content card buttons.
- **Server actions** — `saveNote` (upsert by member_id + content_id), `getNoteForContent`, `getMemberNotes`.
- **Notes archive** — `/journal` page with `JournalList` component, month grouping.
- **Freeform notes** — schema supports `content_id = NULL`. Server action accepts it. **No "New Entry" button in UI yet.**

### Admin

- **Content list** — `/admin/content` with type filters and status badges.
- **Content create/edit** — full form with all fields: type, title, excerpt, description, body, reflection prompt, media URL auto-detect, resource links editor, publishing controls.
- **Server actions** — `createContent` / `updateContent` in `app/admin/content/actions.ts`.
- **Layout** — sidebar nav (Overview / Content / Ingestion), admin email display.

### Member UI System

- **MemberTopNav** — sticky top bar on desktop (wordmark + links + streak chip), bottom tab bar on mobile (Today / Library / Journal / Account).
- **`member-container`** — CSS utility class: max-width 52rem with responsive padding.
- **PageHeader** — reusable heading + optional subtitle.
- **EmptyState** — reusable icon + title + subtitle.
- **Design tokens** — comprehensive CSS custom properties for colors, spacing, typography.

### Database Schema

10 applied migrations. Core tables:

| Table | Status | Active Code |
|-------|--------|-------------|
| `member` | ✅ | Auth, billing, streak, profile |
| `content` | ✅ | Today queries, library, search, admin CRUD |
| `journal` | ✅ | Notes from content cards |
| `progress` | ✅ | Listen tracking |
| `activity_event` | ✅ | Engagement log (5 event types actively fired) |
| `community_post` | ⚠️ Schema only | **Zero application code** |
| `content_embedding` | ⚠️ Schema only | Empty, pgvector enabled |
| `content_chunk` | ⚠️ Schema only | Empty, for future RAG |

### Content Type Enum (actual in database)

```
daily_audio | weekly_principle | monthly_theme | library | workshop
```

**Not in enum:** `coaching_call`, `event`, `bonus`, `course_lesson`

---

## Partial / Scaffolded

| Feature | What Exists | What's Missing |
|---------|-------------|----------------|
| Journal "New Entry" | Schema supports it (`content_id` nullable), server action accepts null | No button in the journal page UI |
| Admin ingestion | Route exists at `/admin/ingestion` | Static placeholder text only — no pipeline code |
| Dashboard | Route exists at `/dashboard` | Milestone 01 leftover — static cards, not linked from nav. Dead code. |
| Multi-tier pricing | Stripe tier mapping works for all 4 levels | `/join` page only renders Level 1 monthly + annual |
| Vector tables | `content_embedding` + `content_chunk` exist with pgvector | No embedding generation code, no semantic search |
| AI metadata | `ai_generated_title`, `ai_generated_description` columns exist | No AI code writes to them |
| Content source | `source` enum (gdrive/vimeo/admin) exists | All content is `source = 'admin'`. No ingestion pipeline. |
| Seed data | `seed.sql` exists | **1 row only, uses outdated column names. Will fail if run against current schema.** |

---

## Does Not Exist

| Feature | Notes |
|---------|-------|
| **Tier-based content gating** | No `tier_min` column. No `checkTierAccess()` helper. No tier filtering in queries. |
| **`/coaching` page** | No route, component, or query exists |
| **`coaching_call` content type** | Not in the database enum |
| **`starts_at` column** | Not in the content table |
| **`onboarding_completed_at` column** | Not on member table |
| **Onboarding flow** | No overlay, no first-login detection, no welcome sequence |
| **Admin content calendar** | No calendar view |
| **Admin member viewer** | No `/admin/members` route |
| **Google Drive ingestion** | No code |
| **Transcription** | No code |
| **AI content generation** | No code |
| **Semantic / vector search** | Only FTS exists |
| **ActiveCampaign integration** | No code |
| **Resend transactional email** | No code |
| **Castos podcast publishing** | No code |
| **Community features** | Table exists, zero code |
| **Events system** | No code |
| **Q&A system** | No code |
| **Error boundaries** | No `error.tsx` or `not-found.tsx` in member area |
| **Courses** | No code, no tables |

---

## Major Doc/Code Mismatches

| Document says | Actual code |
|---------------|-------------|
| `POSITIVES_AI_CONTEXT.md` lists `coaching_call` and `event` as current content types | Enum only has: `daily_audio`, `weekly_principle`, `monthly_theme`, `library`, `workshop` |
| `POSITIVES_AI_CONTEXT.md` references `content.tier_min` | Column does not exist |
| `POSITIVES_AI_CONTEXT.md` references `member.onboarding_completed_at` | Column does not exist |
| `POSITIVES_AI_CONTEXT.md` says "Add Entry button" on journal page | Button does not exist |
| `member-experience-implementation-plan.md` says weekly/monthly are hardcoded | They are fully query-driven since Sprint 1 |
| Roadmap lists Resend and ActiveCampaign as part of tech stack | Neither has any integration code |
| `PROJECT_BRIEF.md` lists Twilio for SMS | No Twilio code or dependency exists |
| `README.md` lists SMS/Twilio as tech stack | No Twilio code exists |
| Roadmap section 1.1 says community_post table is used | Zero application code references it |

---

## Immediate Technical Risks

1. **Seed data is broken.** `seed.sql` uses deprecated column names (`is_active`, `published_at`) that don't match current schema. Running it will produce a row that no query will find.

2. **No error boundaries.** If a Today or Library query fails, the user sees a raw Next.js error. No `error.tsx` or `not-found.tsx` files exist in the member area.

3. **`dashboard` route is dead code.** Not linked from nav, not redirected. Will confuse any future developer who discovers it.

4. **`is_active` column is orphaned.** Added in 0001, superseded by `status` in 0006. No code queries it anymore, but it still exists and accepts writes.

5. **`community_post` table is orphaned.** Defined in 0001 with RLS in 0002. Zero reads, zero writes, zero UI. Pure technical debt.

---

## Recommended Next Milestone

**Tier gating + coaching system.** This is the first feature that requires schema changes and is a prerequisite for every premium tier feature that follows. It validates the `tier_min` pattern with a real use case (coaching for Level 3+) and closes the most visible product gap between what the docs describe and what the code delivers.
