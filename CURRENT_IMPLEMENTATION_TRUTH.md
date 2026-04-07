# CURRENT_IMPLEMENTATION_TRUTH.md

*Verified against the linked Supabase project, current codebase, generated TypeScript types, and local migration history.*\
*Last verified: 2026-04-07 — commit `19dc006`*

---

## Launch Decision

Positives is preparing for a **Level 1 public launch** (founding member pricing). Levels 2–3 self-serve upgrades are built and ready to enable. Level 4 is admin-assigned only.

### In launch scope now

- Level 1 daily practice experience
- Library, journal, and account
- Stripe checkout for Level 1 (founding member $37/mo, $370/yr)
- Payment-first onboarding and success-page login
- Admin content, month, and member tooling
- `/upgrade` self-serve upgrade path for L2 and L3 (ready, not yet promoted)
- Transactional email via Resend (welcome, receipt, payment-failed) ✅

### Explicitly out of launch scope

- Community launch
- Events
- Marketing automation lifecycle sequences (ActiveCampaign — setup in progress)
- Google Drive ingestion
- Castos automation
- AI embeddings / semantic search population

---

## Domain

**Live domain:** `https://positives.life`

- Vercel: `positives.life` configured as primary domain ✅
- Supabase auth site URL: `https://positives.life` ✅
- Supabase redirect allowlist: `https://positives.life/**`, `https://positives-membership.vercel.app/**`, `http://localhost:3000/**` ✅
- Stripe webhook: `https://positives.life/api/webhooks/stripe` ✅
- Resend sending domain: `positives.life` — verified ✅

---

## Stripe Pricing — Canonical Record

All prices are **founding member rates**. Retail pricing exists in the roadmap but no retail Stripe prices have been created.

| Tier | Monthly Price ID | Monthly Rate | Annual Price ID | Annual Rate |
|------|-----------------|-------------|-----------------|------------|
| L1 | `STRIPE_PRICE_LEVEL_1_MONTHLY` | $37/mo | `STRIPE_PRICE_LEVEL_1_ANNUAL` | $370/yr |
| L2 | `STRIPE_PRICE_LEVEL_2_MONTHLY` | $97/mo | `STRIPE_PRICE_LEVEL_2_ANNUAL` | $970/yr |
| L3 | `STRIPE_PRICE_LEVEL_3_MONTHLY` | $297/mo | `STRIPE_PRICE_LEVEL_3_ANNUAL` | $2,970/yr |
| L4 | `STRIPE_PRICE_LEVEL_4_THREE_PAY` | $1,500/mo × 3 | — | — |

**L4 additional notes:**
- Pay-in-full: $4,500 — created as a Stripe invoice (not a subscription)
- 3-pay plan: $1,500/month × 3, subscription auto-cancels at 90 days via `cancel_at`
- Custom packages: created as named Stripe Prices on product `STRIPE_PRODUCT_LEVEL_4` via the admin tool — they appear as one-click presets on future Assign L4 calls
- Annual rule across L1–L3: 10 × monthly rate (2 months free)
- L4 is never self-serve — assigned by admin after a Breakthrough Session call

**Archived Stripe prices (do not use):**
- Legacy L1 $49/mo, $490/yr
- Legacy L2 $79/mo, $790/yr
- Legacy L4 $15,000/yr (incorrect structure)

---

## What Is Actually Built

### Member experience

- `/today` — daily audio, weekly principle, monthly theme, archive rail, integrated note entry
- `/library` — courses and monthly archive
- `/practice` — streaks, heatmap, continue listening, tabbed practice sections
- `/journal` — note archive
- `/account` — billing portal, password management, timezone settings
- `/coaching` — tier-gated, replay support
- `/upgrade` — self-serve upgrade to L2 or L3; L4 books a Breakthrough Session call

### Billing and auth

- Supabase auth with magic-link and password flows
- Stripe checkout, webhook handling, and customer portal
- Post-checkout onboarding token flow
- `requireActiveMember()` guards on member routes
- `requireAdmin()` email-allowlist guard on admin routes
- Stripe webhook tier map supports L1–L4 including custom L4 subscriptions via `metadata.assigned_tier`

### Email — Resend ✅ Live

- **Sending domain:** `positives.life` (verified in Resend)
- **From:** `Positives <hello@positives.life>`
- **Reply-to:** `support@positives.life`
- **Client:** `lib/email/resend.ts` — singleton with `FROM_ADDRESS` + `REPLY_TO` constants
- **Brand system:** `lib/email/brand.ts` — inline tokens (teal gradient, Montserrat/Poppins, design-token colors)
- **Templates:**
  - `lib/email/templates/welcome.ts` — fires on `checkout.session.completed`
  - `lib/email/templates/receipt.ts` — fires on `invoice.payment_succeeded`
  - `lib/email/templates/payment-failed.ts` — fires on `invoice.payment_failed`
- All email sends are **non-fatal** — failures are logged but never block webhook acknowledgment
- **Agent skills installed:** `resend`, `email-best-practices`, `agent-email-inbox` in `.agents/skills/`

### Admin system

- `/admin/content`, `/admin/months`, `/admin/members`, `/admin/content/calendar`, `/admin/courses`, `/admin/ingestion`
- `/admin/members/[id]/assign-l4` — L4 package assignment tool (4 modes: pay-in-full, 3-pay, saved preset, custom builder)
- Month workspace and content calendar
- Vimeo video upload / replace / remove flow
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

*Note: `l4_package_preset` table was created and dropped in the same session — Stripe Prices are the canonical preset store.*

### Member snapshot (as of 2026-04-07)

- `active level_1`: 2
- `active level_3`: 1
- `canceled`: 1

### Published content snapshot (as of 2026-04-07)

- `daily_audio`: 33 published
- `weekly_principle`: 8 published
- `monthly_theme`: 3 published
- `coaching_call`: 3 published

---

## Migration Truth

### Current migration inventory (29 files — verified aligned with Supabase)

Migrations are timestamp-prefixed. The repo and remote are in sync as of `19dc006`.

---

## Launch Risks Still Open

### Engineering

- Member E2E smoke coverage needed repair and should be rerun after each launch-critical change
- ActiveCampaign lifecycle sequences not yet implemented — transactional email is live via Resend
- Castos podcast feed integration not yet built
- `support@positives.life` mailbox not yet set up (Google Workspace needed for reply-to to function)

### Content ops

- The Level 1 launch still depends on filling the forward content runway through June 1, 2026
- `monthly_practice` for `2026-05` is still `draft`

### Product scope

- Community must remain behind `ENABLE_COMMUNITY_PREVIEW=false`
- `/upgrade` is built but not yet linked from marketing materials — enable intentionally at L1 launch
- Marketing copy must not imply events or live coaching are currently available at L2

---

## What Is Not Yet Built

| Feature | Status |
|---|---|
| Lifecycle email / CRM | ⚠️ ActiveCampaign setup in progress (brand guide being configured) |
| Post-L4 expiry automation | ⚠️ Documented in roadmap — pending ActiveCampaign + webhook handler |
| Google Drive ingestion | ⚠️ Not implemented |
| Castos automation | ⚠️ Not implemented |
| AI embeddings backfill | ⚠️ Schema only |
| Event system | ⚠️ Not implemented |
| Role-based admin auth | ⚠️ Deferred until after L1 launch |
| `support@positives.life` mailbox | ⚠️ Google Workspace needed |

---

## Current Recommendation

Treat the app as **ready for a controlled Level 1 soft launch** with founding member pricing.

Gates before broad launch:

1. ~~Select marketing automation platform and implement transactional email~~ ✅ Done — Resend live
2. Set up `support@positives.life` mailbox (Google Workspace) so reply-to emails land somewhere
3. Configure ActiveCampaign lifecycle sequences (onboarding, engagement, upgrade nurture)
4. Verify forward content window through June 1
5. Run Playwright E2E smoke test end-to-end
6. Rehearse production signup → payment → success-page login → welcome email → playback flow
