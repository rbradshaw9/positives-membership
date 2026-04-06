# Positives Platform

Practice-based membership platform for daily grounding, emotional resilience, and personal growth.

Positives is designed to feel like a gym for personal growth. Members do not complete it — they return to it. The product centers on a daily audio practice supported by weekly principles, monthly themes, journaling, progress tracking, coaching, and private podcast delivery.

---

## Product Summary

The core experience is simple:

- **Daily** — short grounding audio from Dr. Paul
- **Weekly** — a principle and simple practice
- **Monthly** — a deeper theme for reflection and growth

Over time, members can deepen engagement through:

- Content library
- Quarterly events
- Coaching circle
- Executive coaching

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
| Video (primary) | **Mux** — upload, delivery, analytics, resume tracking | ✅ Active |
| Video (legacy) | Vimeo — fallback for pre-Mux content | ✅ Fallback |
| Audio hosting | S3 (presigned URLs) | ✅ Active |
| Audio ingestion | Google Drive → S3 | ⚠️ Planned |
| Private podcast feed | Castos | ⚠️ Planned |
| Email — transactional | Resend | ⚠️ Planned |
| Email — lifecycle | ActiveCampaign | ⚠️ Planned |

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

Mux is the system of record for hosted video content. The admin includes a drag-drop upload panel (`VideoUploadPanel`) that chunks files to Mux, polls for processing, and commits `mux_playback_id` + `mux_asset_id` to the content record. `VideoEmbed` routes to MuxPlayer (primary), Vimeo iframe (legacy), or YouTube based on available IDs.

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

### Level 3 — Coaching Circle
- Everything in Levels 1–2
- Weekly group coaching calls
- Coaching replays
- Implementation support

### Level 4 — Executive Coaching
- Everything in Levels 1–3
- Bi-weekly 1:1 coaching
- Personalized support

---

## Product Modules

| Module | Status |
|---|---|
| Daily Practice Engine (Today page) | ✅ Built |
| Content Library | ✅ Built |
| Journal / Notes | ✅ Built |
| Coaching System | ✅ Built |
| Community / Q&A | ✅ Built (feature-flagged) |
| Mux Video Pipeline | ✅ Built |
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
| Post-11 | Mux video migration, video tracking, months workspace, community Q&A, heatmap |

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

Active platform with members. Core product complete. Current focus: admin tooling polish and multi-tier pricing on the `/join` page.

---

## License

Private project. All rights reserved.