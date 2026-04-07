# CURRENT_IMPLEMENTATION_TRUTH.md

*Verified against the linked Supabase project, current codebase, generated TypeScript types, and local migration history.*\
*Last verified: 2026-04-07*

---

## Launch Decision

Positives is preparing for a **Level 1 public launch only**.

### In launch scope now

- Level 1 daily practice experience
- Library, journal, and account
- Stripe checkout for Level 1
- Payment-first onboarding and success-page login
- Admin content, month, and member tooling

### Explicitly out of launch scope

- Live Level 2-4 commerce
- Community launch
- Events
- Automated email systems
- Google Drive ingestion
- Castos automation
- AI embeddings / semantic search population

Production launch copy and docs should describe higher tiers as preview / notify-me only.

---

## What Is Actually Built

### Member experience

- `/today` with daily audio, weekly principle, monthly theme, archive rail, and integrated note entry
- `/library` with courses and monthly archive
- `/practice` with streaks, heatmap, continue listening, and tabbed practice sections
- `/journal` note archive
- `/account` with billing portal, password management, and timezone settings
- `/coaching` route with tier gating and replay support

### Billing and auth

- Supabase auth with magic-link and password flows
- Stripe checkout, webhook handling, and customer portal
- Post-checkout onboarding token flow
- `requireActiveMember()` guards on member routes
- `requireAdmin()` email-allowlist guard on admin routes

### Admin system

- `/admin/content`, `/admin/months`, `/admin/members`, `/admin/content/calendar`, `/admin/courses`, `/admin/ingestion`
- Month workspace and content calendar
- Mux video upload / replace / remove flow
- Auto-linking from `content.month_year` to `monthly_practice`
- Course authoring and LearnDash import support

### Media and progress

- `MemberAudioProvider` for persistent audio across member routes
- `PersistentAudioPlayer` hidden on `/today`, visible after navigation away
- `VideoEmbed` with Mux, Vimeo, and YouTube support
- Resume tracking via `video_views`
- Practice completion and engagement tracking via `progress` and `activity_event`

---

## Database Truth

### Public tables in the live schema (17 total)

| Table | Status |
|---|---|
| `activity_event` | ✅ Active |
| `community_post` | ✅ Active, feature-flagged |
| `community_post_like` | ✅ Active, feature-flagged |
| `content` | ✅ Active |
| `content_chunk` | ⚠️ Schema only |
| `content_embedding` | ⚠️ Schema only |
| `course` | ✅ Active |
| `course_lesson` | ✅ Active |
| `course_module` | ✅ Active |
| `course_progress` | ✅ Active |
| `course_session` | ✅ Active |
| `journal` | ✅ Active |
| `member` | ✅ Active |
| `monthly_practice` | ✅ Active |
| `progress` | ✅ Active |
| `support_submissions` | ✅ Active |
| `video_views` | ✅ Active |

### Live production shape verified on 2026-04-07

- `member`: 4 rows
- `content`: 47 rows
- `monthly_practice`: 4 rows
- `course`: 1 row
- `course_module`: 1 row
- `course_lesson`: 6 rows
- `course_session`: 0 rows
- `course_progress`: 1 row
- `support_submissions`: 0 rows
- `community_post`: 0 rows
- `community_post_like`: 0 rows
- `video_views`: 5 rows

### Published content snapshot

- `daily_audio`: 33 published
- `weekly_principle`: 8 published
- `monthly_theme`: 3 published
- `coaching_call`: 3 published

### Member snapshot

- `active level_1`: 2
- `active level_3`: 1
- `canceled`: 1

---

## Migration Truth

The repo migration history is now aligned with the linked Supabase project.

### Status

- `npx supabase migration list` matches local and remote for all applied versions
- `types/supabase.ts` was regenerated from the linked project on 2026-04-07
- The previous schema drift around `monthly_practice`, `support_submissions`, and the course tables is resolved in version control

### Current migration inventory (27 files)

- `20260331132817_0001_initial_schema.sql`
- `20260331132834_0002_rls_policies.sql`
- `20260331132835_0003_member_bootstrap_trigger.sql`
- `20260331133333_0004_fix_updated_at_search_path.sql`
- `20260331211634_add_onboarding_columns.sql`
- `20260401143734_0006_sprint1_today_foundation.sql`
- `20260401144136_0007_activity_event_rls.sql`
- `20260401145032_0008_journal_rls_and_index.sql`
- `20260401154153_sprint5_rich_content_search_vector.sql`
- `20260401154217_sprint5_rls_vector_tables.sql`
- `20260401180959_0011a_enums.sql`
- `20260401181006_0011b_columns_and_index.sql`
- `20260402141653_community_qa_schema.sql`
- `20260402155635_backfill_weekly_month_year.sql`
- `20260402155636_seed_progress_for_l1_user.sql`
- `20260402185018_add_mux_playback_id_to_content.sql`
- `20260402190555_add_mux_columns_to_content.sql`
- `20260402195055_add_video_views.sql`
- `20260402195227_video_views_add_resume_at_seconds.sql`
- `20260402213544_create_monthly_practice_table.sql`
- `20260406154256_mux_video_tracking.sql`
- `20260406164309_support_submissions.sql`
- `20260406185227_create_courses_schema.sql`
- `20260406193302_add_resources_to_course_session.sql`
- `20260406193615_add_four_level_course_hierarchy.sql`
- `20260406203825_add_course_progress_and_sales_columns.sql`
- `20260406214012_add_course_lesson_id_to_video_views.sql`

---

## Launch Risks Still Open

### Engineering

- Member E2E smoke coverage needed repair and should be rerun after each launch-critical change
- Production release confidence still depends on passing build, lint, audit, and Playwright gates together

### Content ops

- The Level 1 launch still depends on filling the forward content runway through June 1, 2026
- Weekly items missing audio sources still need to be resolved in the live dataset
- `monthly_practice` for `2026-05` is still `draft`

### Product scope

- Community must remain behind `ENABLE_COMMUNITY_PREVIEW=false`
- Level 2-4 Stripe prices should remain unset until those tiers are intentionally launched
- Marketing copy must not imply that coaching, events, or higher tiers are live

---

## What Is Not Yet Built

| Feature | Status |
|---|---|
| Transactional email | ⚠️ No launch-ready implementation |
| Lifecycle email / CRM | ⚠️ No launch-ready implementation |
| Google Drive ingestion | ⚠️ Not implemented |
| Castos automation | ⚠️ Not implemented |
| AI embeddings backfill | ⚠️ Schema only |
| Event system | ⚠️ Not implemented |
| Role-based admin auth | ⚠️ Deferred until after L1 launch |

---

## Current Recommendation

Treat the app as **close to a controlled Level 1 soft launch**, not a broad multi-tier launch.

The required launch gates remain:

1. Keep docs and copy aligned with the L1-only promise.
2. Keep build, lint, audit, and Playwright green together.
3. Fill and verify the forward content window.
4. Rehearse the production signup, payment, success-page login, and playback flow end to end.
