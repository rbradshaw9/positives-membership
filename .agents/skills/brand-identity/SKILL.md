---
name: brand-identity
description: Provides the single source of truth for Positives brand guidelines, design tokens, technology choices, and voice/tone. Use this skill whenever generating UI components, styling applications, writing copy, or creating user-facing assets to ensure brand consistency.
---

# Brand Identity & Guidelines

**Brand Name:** Positives

This skill defines the core constraints for visual design, product experience, technical implementation, and brand voice for Positives. Adhere to these guidelines strictly to maintain consistency across the app, website, member experience, and all supporting assets.

## Brand Positioning

Positives is a practice-based membership platform designed to help people cultivate greater positivity, emotional resilience, and peace in their daily lives.

It should feel like **a gym for personal growth**, not a course portal, therapy app, or traditional coaching site.

Members do not complete Positives.

They return to it.

The daily habit is the center of the experience. Everything else — weekly principles, monthly themes, journaling, coaching, and future events — supports that daily rhythm.

## Core Product Experience Principles

### Simplicity
Members should never feel overwhelmed. The interface should keep the next action obvious and easy.

### Habit Formation
The daily practice is the most important behavior in the system. Product, design, and messaging should reinforce consistency over intensity.

### Emotional Support
The platform should feel calm, supportive, hopeful, and grounded. It should not feel aggressive, performance-obsessed, or overly clinical.

### No “Behind” Feeling
Members should never feel like they are failing, behind, or incomplete. Positives is cyclical and practice-based, not curriculum-based.

## Experience Model

Positives is organized around a simple rhythm:

- **Daily:** short grounding audio
- **Weekly:** a principle and practice
- **Monthly:** a guiding theme

Content should be framed around:

- **Today**
- **This Week**
- **This Month**

Avoid presenting the experience as linear lessons, modules, or completion tracks.

## Audience

Positives is for people seeking more positivity, emotional balance, and clarity in daily life.

This includes:

- people interested in personal development
- people navigating anxiety, fear, anger, or overwhelm
- people seeking emotional resilience
- people exploring life coaching
- people wanting a simple daily grounding practice

The brand should feel accessible to beginners while still supporting deeper transformation.

## Voice & Tone

The Positives voice should feel:

- calm
- encouraging
- clear
- grounded
- compassionate
- emotionally intelligent
- practical
- non-preachy

It should not feel:

- hypey
- pushy
- overly corporate
- overly clinical
- self-important
- guru-heavy
- dense or academic

### Writing Style Guidelines

- Keep language clear and human
- Prioritize warmth and simplicity over cleverness
- Use short, steady, emotionally safe phrasing
- Focus on support, clarity, and progress
- Avoid language that creates guilt, shame, urgency, or fear
- Avoid sounding like a sales funnel unless specifically writing sales material
- Avoid language that makes the user feel broken

### Example Tone

Good:
- “Today’s practice”
- “A simple way to reset”
- “Come back to this when you need it”
- “A small daily habit that creates meaningful change over time”

Avoid:
- “Crush your mindset goals”
- “Unlock your full potential now”
- “Transform your life instantly”
- “Complete the program”

## Visual Direction

The Positives visual system should feel closer to a premium wellness app than a learning management system.

Design should feel:

- calm
- spacious
- modern
- premium
- soft but confident
- emotionally safe
- mobile-friendly

Avoid design that feels:

- noisy
- aggressive
- overly gamified
- overly corporate SaaS
- overly masculine
- cluttered
- flashy

## UI Priorities

When generating interfaces, prioritize:

1. **Today’s audio**
2. **The current weekly principle**
3. **The current monthly theme**
4. Supporting reflection and journaling
5. Easy navigation to library and coaching
6. Future event experiences should feel additive, not central

The daily audio player is the most important UI element in the product and should always feel prominent, polished, and easy to use on mobile.

## Technology Constraints

### Current Core Stack — Live

The following are in active use in production:

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| UI Runtime | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 (`@import "tailwindcss"`) |
| Hosting | Vercel | — |
| Database / Auth | Supabase (PostgreSQL + SSR client) | ^0.10.0 |
| Payments | Stripe | ^21.0.1 |
| Video Hosting | Vimeo | — |
| Admin rich-text editor | Tiptap | v3 (tiptap/react, tiptap/starter-kit, tiptap-markdown) |
| Member-side markdown rendering | react-markdown + remark-gfm | ^10.x / ^4.x |
| Date utilities | date-fns-tz | ^3.2.0 |

**Critical implementation notes:**
- Tailwind is v4. The config syntax is different from v3. Use `@import "tailwindcss"` in globals.css (not `@tailwind base/components/utilities`). Theme extension is done in `tailwind.config.ts` using CSS variable references.
- **shadcn/ui is NOT installed.** Do not reference or generate shadcn component imports. Use the project's Tailwind utility classes and CSS custom properties directly.
- **Lucide React is NOT installed.** Do not use lucide-react imports. Use inline SVG or emoji for icons if needed.
- There is no component library — all components are custom-built using Tailwind utility classes against the project's CSS custom property tokens.
- The App Router is the only routing pattern in use. There are no Pages Router files.

### Admin Area — Live

The admin area lives at `/admin/*` and is protected server-side by `requireAdmin()` (`lib/auth/require-admin.ts`), which redirects non-admin users to `/dashboard`. Admin emails are configured via the `ADMIN_EMAILS` environment variable.

Currently live admin routes:
- `/admin` — overview
- `/admin/content` — content list with publish/unpublish toggle
- `/admin/content/new` — create new content
- `/admin/content/[id]/edit` — edit existing content (includes Tiptap body editor)
- `/admin/members` — paginated member list with search (email/name) and filters (status, tier)
- `/admin/members/[id]` — member detail: profile, stats (streak, journal entries, listens), and activity timeline

Admin mutations that bypass RLS use the Supabase service-role client (via `SUPABASE_SERVICE_ROLE_KEY`). Member management pages are read-only — billing must be managed exclusively in the Stripe Dashboard.

### Supabase as Source of Truth

Supabase is the single source of truth for:

- member identity
- subscription state (mirrored from Stripe webhooks)
- access control (enforced server-side)
- engagement data (`activity_event` table)
- progress (`progress` table — listens, completions)
- journal entries (`journal` table)
- content (`content` table — all types, statuses, tier gating)

Stripe controls billing state. Subscription status and tier in Supabase are populated by Stripe webhooks. Access decisions must always be enforced server-side.

### Content Types and Tier Gating — Live

The `content` table supports these types (the `content_type` enum):
- `daily_audio` — daily grounding audio
- `weekly_principle` — weekly practice content
- `monthly_theme` — monthly guiding theme
- `coaching_call` — group coaching sessions (live and replay)
- `library` — library resource
- `workshop` — workshop content

Each content row may have a `tier_min` column (the `subscription_tier` enum: `level_1`, `level_2`, `level_3`, `level_4`). Content with `tier_min = NULL` is visible to all members. Content with `tier_min` set is only visible to members at that tier or above. Gating is enforced server-side in query functions.

### Planned / Future Integrations

The following are planned but NOT yet live:

- **Audio Ingestion:** Google Drive → S3 (the full ingestion pipeline — transcription, AI tagging, admin review). Currently audio is added manually via admin.
- **Private Podcast Delivery:** Castos
- **Email Automation:** ActiveCampaign
- **Transactional Messaging:** Twilio or similar

When making product or implementation decisions, do not assume these future integrations are already live unless the current codebase confirms they are.

## Content Pipeline Rules

### Current Content Reality — Live

Content is created and managed directly through the admin UI (`/admin/content/new` and `/admin/content/[id]/edit`). Body content is authored using the Tiptap rich-text editor (which serializes to markdown via `tiptap-markdown`) and rendered member-side as formatted HTML using `react-markdown` with `remark-gfm`. The class `.prose-positives` scopes all markdown output in member-facing cards.

Admin notes can be attached to any content record. Content progresses through statuses: `draft` → `ready_for_review` → `published` → `archived`.

### Planned Audio Ingestion Pipeline — Not Yet Live

The intended long-term daily audio pipeline is:

1. Dr. Paul uploads audio to a designated Google Drive folder
2. The system ingests the file into S3 for storage and processing
3. The file is transcribed
4. AI generates suggested title, description, and tags
5. Admin reviews and approves content
6. Audio is published to:
   - the Positives platform
   - the private member podcast feed via Castos

Video content is hosted in Vimeo. Audio currently uses Castos episode URLs or S3 keys added manually by admin.

Do not assume Mux, direct audio upload to Castos, or client-side access control.

## Retention & Behavior Design

The product should reinforce consistency through:

- streak tracking
- reflection prompts
- private journal history
- milestone recognition
- supportive reminders

These should feel encouraging, not manipulative.

Gamification should be subtle and emotionally safe.

Note: not every retention mechanism listed here is necessarily implemented yet. Treat this section as product-direction guidance, not a guarantee that every behavior layer is live in the current build.

## Membership Structure

Tiers are stored in the `subscription_tier` enum: `level_1`, `level_2`, `level_3`, `level_4`. Tier access is enforced server-side via the `tier_min` field on content records.

### Level 1 — Membership ✅ Live
- daily audio
- weekly principles
- monthly themes
- content library
- private podcast feed (planned — Castos not yet integrated)

### Level 2 — Membership + Events + Q&A ⏳ Partially planned
- everything in Level 1
- virtual events (planned — not yet built)
- Q&A access (planned — not yet built)
- event replays (planned — not yet built)

### Level 3 — Coaching Circle ✅ Live
- everything in Levels 1 and 2
- weekly group coaching sessions (live — `coaching_call` content type)
- coaching replays (live — stored as `coaching_call` with Vimeo replay)
- implementation support

### Level 4 — Executive Coaching ✅ Live
- everything in Levels 1–3
- bi-weekly 1:1 coaching
- personalized support

## Pricing Presentation Rules

When presenting the core membership price, always show:

- **Regular price:** $97/month
- **Offer price:** $49/month

Do not show the offer price in isolation.

Do not use dark patterns.

Members must always have clear access to billing management and cancellation through Stripe.

## Reference Documentation

Depending on the task you are performing, consult the specific resource files below. Do not guess brand elements; always read the corresponding file when it exists and is current.

### For Logos and Favicon
If you need logo images or favicons, they are located in:
👉 **[`resources/assets/`](resources/assets/)**

### For Visual Design & UI Styling
If you need exact colors, fonts, border radii, or spacing values, read:
👉 **[`resources/design-tokens.json`](resources/design-tokens.json)**

### For Coding & Component Implementation
If you are generating code, choosing libraries, or structuring UI components, read the technical constraints here:
👉 **[`resources/tech-stack.md`](resources/tech-stack.md)**

### For Copywriting & Content Generation
If you are writing marketing copy, onboarding copy, error messages, documentation, or user-facing text, read the persona guidelines here:
👉 **[`resources/voice-tone.md`](resources/voice-tone.md)**

If any referenced resource file is missing or outdated, prefer the current roadmap and implementation truth over guessing.

## Non-Negotiable Rules

### Product / UX
- Positives must always feel like a daily practice platform, not a course portal
- Members must never feel behind — the experience is cyclical, not curriculum-based
- The daily audio player is the most important UI element in the product
- The interface must remain calm, clear, and mobile-first
- Gamification must be subtle and emotionally safe — no aggressive streaks or shame mechanics

### Data & Access
- Access control must always be enforced server-side
- Supabase is the single source of truth for identity, subscriptions, progress, and engagement
- Stripe is authoritative for billing state — never mutate subscription data outside of Stripe
- Tier gating is implemented via `tier_min` on content rows; always query with proper tier logic
- Admin routes must be guarded by `requireAdmin()` from `lib/auth/require-admin.ts`
- Admin billing controls do not exist in the app — billing must go through the Stripe Dashboard

### Infrastructure
- Vimeo is the video host
- Google Drive → S3 is the planned (not yet live) audio ingestion path
- Castos is the planned (not yet live) private podcast delivery layer
- Do not generate code that assumes Mux, direct Castos upload, or client-side access control

### Technology
- This project uses Tailwind v4 — do not use v3 `@tailwind` directives or `theme()` function syntax
- shadcn/ui is NOT installed — do not reference it or generate shadcn component imports
- Lucide React is NOT installed — do not use lucide-react imports
- Tiptap v3 is the admin body editor — use `@tiptap/react`, `@tiptap/starter-kit`, `tiptap-markdown`
- react-markdown with remark-gfm is the member-side renderer — scope output with `.prose-positives`
- The App Router is used exclusively — no Pages Router patterns

### Content
- Coaching (`coaching_call`) is a live content type and must feel integrated, not bolted on
- Future event and Q&A experiences should support the daily rhythm, not compete with it
- Do not present audio ingestion as live — it is still a planned pipeline