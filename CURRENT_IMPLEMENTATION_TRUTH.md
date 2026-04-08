# CURRENT_IMPLEMENTATION_TRUTH.md

*Verified against the linked Supabase project, current codebase, generated TypeScript types, local migration history, and launch audit output.*\
*Last verified: 2026-04-07 — local working tree + linked project*

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
- Affiliate referral program via Rewardful ✅
- 1-click billing recovery for past-due members ✅

### Explicitly out of launch scope

- Community launch
- Events
- Marketing automation lifecycle sequences (ActiveCampaign — setup in progress)
- Google Drive ingestion
- Castos automation
- AI embeddings / semantic search population
- 2-tier affiliate commissions (Rewardful is single-tier only)

---

## Domain

**Live domain:** `https://positives.life`

- Vercel: `positives.life` configured as primary domain ✅
- Supabase auth site URL: `https://positives.life` ✅
- Supabase redirect allowlist: `https://positives.life/**`, `https://positives-membership.vercel.app/**`, `http://localhost:3000/**` ✅
- Stripe webhook: `https://positives.life/api/webhooks/stripe` ✅
- Resend sending domain: `positives.life` — verified ✅
- Rewardful campaign URL: `https://positives.life` ✅

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
- `/account/affiliate` — full affiliate portal (see Affiliate section below)
- `/coaching` — tier-gated, replay support
- `/upgrade` — self-serve upgrade to L2 or L3; L4 books a Breakthrough Session call

### Billing and auth

- Supabase auth with magic-link and password flows
- Stripe checkout, webhook handling, and customer portal
- Post-checkout onboarding token flow
- `requireActiveMember()` guards on member routes (allows `past_due` → billing portal)
- `requireAdmin()` email-allowlist guard on admin routes
- Stripe webhook tier map supports L1–L4 including custom L4 subscriptions via `metadata.assigned_tier`
- 1-click billing recovery: HMAC-signed tokens (`lib/auth/billing-token.ts`) with 7-day expiry, allows past-due members to access Stripe billing portal without login

### Affiliate Program — Rewardful ✅ Live

- **Platform:** Rewardful (single-tier, 20% recurring commission)
- **Tracking:** `RewardfulTracker` component in root `layout.tsx` captures referral cookies on every page
- **Checkout integration:** `app/join/actions.ts` reads the Rewardful cookie client-side and passes it to Stripe as `client_reference_id` — Rewardful auto-detects conversions via Stripe webhooks
- **Portal:** `/account/affiliate` — native 4-tab portal (My Link, Stats, Share Kit, Earnings)
  - **My Link** — referral link display + copy, commission callout, Rewardful SSO link
  - **Stats** — clicks, leads, conversions from Rewardful API
  - **Share Kit** — email swipes (2), SMS templates (2), DM scripts (2), social captions (3 platforms), key talking points
  - **Earnings** — total paid/pending, PayPal payout setup (saves to Rewardful API), commission history, W-9 tax info note
- **Enrollment:** `ensureAffiliate()` (idempotent create-or-fetch) + cache affiliate ID/token on `member` row
- **AC sync:** `syncAffiliate()` applies `affiliate` tag and stores referral token in custom field → triggers welcome automation
- **Referral link format:** `https://positives.life?via={token}` (homepage landing)
- **API client:** `lib/rewardful/client.ts` — getAffiliate, getAffiliateByEmail, createAffiliate, ensureAffiliate, getAffiliateSSO, getAffiliateCommissions, updateAffiliatePayPal
- **Server actions:** `app/account/affiliate/actions.ts` — getReferralLinkAction, savePayPalEmailAction
- **SSO route:** `app/account/affiliate/portal/route.ts` — generates a magic login link to Rewardful branded portal

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

### ActiveCampaign Integration — In Progress

- **Sync module:** `lib/activecampaign/sync.ts` — `syncMemberToAC()`, `syncAffiliate()`
- **Guard:** All AC calls gated by `acIsConfigured()` — gracefully no-ops if API keys aren't set
- **Custom fields:** membership_tier, stripe_customer_id, rewardful_referral_token
- **Tags:** affiliate, level_1, level_2, level_3, level_4, past_due, canceled
- **Automations pending:** Past Due Recovery, Canceled Win-Back, Affiliate Welcome

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

## Environment Variables

All production-required secrets are documented in `.env.example`. Key variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin operations |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (`https://positives.life`) |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `RESEND_API_KEY` | Transactional email |
| `CRON_SECRET` | Protects `/api/cron/*` endpoints |
| `BILLING_TOKEN_SECRET` | HMAC-SHA256 for 1-click billing recovery tokens |
| `REWARDFUL_API_KEY` | Rewardful public key (client-side tracking) |
| `REWARDFUL_API_SECRET` | Rewardful server-side API auth |
| `ACTIVECAMPAIGN_API_URL` | AC API base URL |
| `ACTIVECAMPAIGN_API_KEY` | AC API key |

**Important:** Always use `NEXT_PUBLIC_APP_URL` (not `NEXT_PUBLIC_SITE_URL`) for absolute URLs.

---

## Database Truth

### Public tables in the live schema (18 total)

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
| `onboarding_sequence` | ✅ Active |
| `progress` | ✅ Active |
| `support_submissions` | ✅ Active |
| `video_views` | ✅ Active |

*Note: `l4_package_preset` table was created and dropped in the same session — Stripe Prices are the canonical preset store.*

### Member table — affiliate columns

| Column | Type | Purpose |
|---|---|---|
| `rewardful_referral_id` | text | The referral ID from Rewardful (set at checkout) |
| `rewardful_affiliate_token` | text | Affiliate's referral token (e.g., "ryan") |
| `rewardful_affiliate_id` | text | Affiliate's Rewardful UUID |

### Member snapshot (as of 2026-04-07)

- `active level_1`: 2
- `active level_3`: 1
- `canceled`: 1

### Published content snapshot (as of 2026-04-07)

- `daily_audio`: 89 published
- `weekly_principle`: 17 published
- `monthly_theme`: 5 published
- `coaching_call`: 3 published

### Monthly practice snapshot (as of 2026-04-07)

- `2026-02`: published
- `2026-03`: published
- `2026-04`: published
- `2026-05`: published
- `2026-06`: published

---

## Migration Truth

### Current migration inventory (33 files — verified aligned with Supabase)

Migrations are timestamp-prefixed. The repo now includes the onboarding-sequence and Rewardful member-field migrations that had previously existed only in the remote project.

---

## Launch Risks Still Open

### Engineering

- Member E2E smoke coverage is green and should be rerun after each launch-critical change
- ActiveCampaign lifecycle sequences not yet implemented — transactional email is live via Resend
- Castos podcast feed integration not yet built
- `support@positives.life` mailbox not yet set up (Cloudflare Email Routing or Zoho Mail recommended)

### Content ops

- Forward launch runway is filled through June 1, 2026
- `npm run audit:launch` is currently green and should be rerun after each publishing batch

### Product scope

- Community must remain behind `ENABLE_COMMUNITY_PREVIEW=false`
- `/upgrade` is built but not yet linked from marketing materials — enable intentionally at L1 launch
- Marketing copy must not imply events or live coaching are currently available at L2

---

## What Is Not Yet Built

| Feature | Status |
|---|---|
| Lifecycle email / CRM | ⚠️ ActiveCampaign setup in progress |
| Past Due Recovery automation | ⚠️ AC automation pending — billing recovery tokens are implemented |
| Canceled Win-Back automation | ⚠️ AC automation pending |
| Post-L4 expiry automation | ⚠️ Documented in roadmap — pending AC + webhook handler |
| Google Drive ingestion | ⚠️ Not implemented |
| Castos automation | ⚠️ Not implemented |
| AI embeddings backfill | ⚠️ Schema only |
| Event system | ⚠️ Not implemented |
| Role-based admin auth | ⚠️ Deferred until after L1 launch |
| `support@positives.life` mailbox | ⚠️ Email routing needed (Cloudflare or Zoho) |
| 2-tier affiliate commissions | ⚠️ Rewardful is single-tier — defer or build custom |
| VIP affiliate tier | 💡 Future — create a second Rewardful campaign (e.g., 30% rate) for affiliates who hit 10+ conversions. Promote top performers manually or via automation. |

---

## Current Recommendation

Treat the app as a **launch candidate for a controlled Level 1 soft launch** with founding member pricing.

Gates before broad launch:

1. ~~Select marketing automation platform and implement transactional email~~ ✅ Done — Resend live
2. Set up `support@positives.life` mailbox (Cloudflare Email Routing recommended — free)
3. Configure ActiveCampaign lifecycle sequences (onboarding, engagement, upgrade nurture)
4. ~~Verify forward content window through June 1~~ ✅ Done — launch audit green
5. ~~Run Playwright E2E smoke test end-to-end~~ ✅ Done — member and admin smokes green
6. ~~Build affiliate referral program~~ ✅ Done — Rewardful + native portal live
7. Rehearse production signup → payment → success-page login → welcome email → receipt email → playback flow
