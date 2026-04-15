# Positives Platform

Practice-based membership platform for daily grounding, emotional resilience, and personal growth.

Positives is designed to feel like a gym for personal growth. Members do not complete it — they return to it. The product centers on a daily audio practice supported by weekly principles, monthly themes, journaling, progress tracking, and a calm member experience.

---

## Product Summary

The core experience is simple:

- **Daily** — short grounding audio from Dr. Paul
- **Weekly** — a principle and simple practice
- **Monthly** — a deeper theme for reflection and growth

The current public launch target is intentionally narrow:

- Content library
- Journal and progress tracking
- Member account and billing management
- Level 1 checkout and onboarding

Higher tiers, events, and community features remain preview / post-launch work until explicitly activated.

---

## Core Principles

- **Simplicity** — the experience should always feel calm and obvious
- **Habit formation** — daily engagement is the primary success metric
- **Emotional support** — this should feel closer to a wellness app than a course portal
- **No "behind" feeling** — no linear curriculum, no completion states

---

## Tech Stack

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js (App Router) | ✅ Active |
| Hosting | Vercel | ✅ Active |
| Database / Auth | Supabase (Postgres + Supabase Auth) | ✅ Active |
| Payments | Stripe | ✅ Active |
| Video | Vimeo and YouTube embeds | ✅ Active |
| Audio hosting | S3 (presigned URLs) | ✅ Active |
| Audio ingestion | Google Drive → S3 | ⚠️ Planned |
| Private podcast feed | Castos | ⚠️ Planned |
| Email — transactional | ActiveCampaign + Postmark | ⚠️ In progress |
| Email — lifecycle | ActiveCampaign (Postmark delivery) | ⚠️ In progress |

---

## Architecture Notes

### Source of Truth

Supabase is the single source of truth for:

- Member identity
- Subscription status
- Content access (unified `content` table)
- Progress tracking
- Journaling
- Engagement data (activity_event log)
- Video watch progress (video_views)

### Billing Access Model

Stripe drives billing state. All access decisions are enforced server-side via `requireActiveMember()` and `checkTierAccess()`. Client-side subscription state is never trusted.

### Video Delivery

Vimeo is the primary hosted video path for Positives content, with YouTube supported for external embeds. Video playback is stored on content records through `vimeo_video_id` and `youtube_video_id`; retired video-provider fields have been removed from the active app model.

### Daily Audio Pipeline

> ⚠️ **Planned — Not yet implemented.** The pipeline below is the target architecture.

1. Dr. Paul uploads audio to a designated Google Drive folder
2. The system ingests the file into S3
3. The file is transcribed
4. AI generates suggested title, description, and tags
5. Admin reviews and approves content
6. Audio is published to the Positives platform and to the private member podcast feed via Castos

**Current state:** Audio files are uploaded manually via the admin content form and stored in S3. Transcription and AI metadata are manually entered. Castos publishing is not yet automated.

---

## Launch Scope

### Live now

- Level 1 daily practice
- Library
- Journal
- Account and billing
- Admin publishing tools

### Preview only

- Level 2-4 offers on `/join`
- Coaching expansion
- Events
- Community launch

## Membership Structure

### Level 1 — Core Practice
- Daily audio
- Weekly principles
- Monthly themes
- Content library

### Level 2 — Plus (Events + Q&A)
- Everything in Level 1
- Quarterly virtual events
- Community Q&A access
- Event replays

Current status: preview only, not part of the Level 1 launch.

### Level 3 — Coaching Circle
- Everything in Levels 1–2
- Weekly group coaching calls
- Coaching replays
- Implementation support

Current status: preview only, not part of the Level 1 launch.

### Level 4 — Executive Coaching
- Everything in Levels 1–3
- Bi-weekly 1:1 coaching
- Personalized support

Current status: preview only, not part of the Level 1 launch.

---

## Product Modules

| Module | Status |
|---|---|
| Daily Practice Engine (Today page) | ✅ Built |
| Content Library | ✅ Built |
| Journal / Notes | ✅ Built |
| Coaching System | ✅ Built |
| Community / Q&A | ✅ Built (feature-flagged, launch-off) |
| Video Playback | ✅ Built |
| Admin Dashboard | ✅ Built |
| Practice Heatmap | ✅ Built |
| Email Lifecycle | ⚠️ Planned |
| Audio Ingestion Pipeline | ⚠️ Planned |
| AI / Semantic Search | ⚠️ Planned |
| Analytics & Retention | ⚠️ Planned |

---

## Sprint History

All development sprints are complete as of 2026-04.

| Sprints | Focus |
|---|---|
| 1–4 | Foundation — Auth, Today, Library, Journal, Admin |
| 5–6 | Media — video embeds, resource links, search |
| 7–8 | UI system — nav, hero, engagement tracking |
| 9 | Member UI — responsive layout, typed content cards |
| 10 | Tier gating, coaching system, journal new entry |
| 11 | Visual cohesion — design tokens, CSS component system |
| Post-11 | Video playback cleanup, video tracking, months workspace, community Q&A, heatmap |

---

## Repository Standards

- Mobile-first UX
- Calm, low-cognitive-load interface
- Server-enforced access control (never trust client state)
- Unified content model — `content` table for all member-facing material
- Clean separation between ingestion, publishing, and delivery
- Architecture that is easy for AI agents and human developers to extend safely

---

## Related Internal Documents

- `POSITIVES_AI_CONTEXT.md` — primary AI working context (start here for new AI sessions)
- `CURRENT_IMPLEMENTATION_TRUTH.md` — verified current feature state
- `docs/positives-platform-roadmap.md` — product roadmap and future phases

---

## Status

Active platform with members. Current focus: Level 1 launch hardening, schema truth, content readiness, and release verification.

---

## License

Private project. All rights reserved.
