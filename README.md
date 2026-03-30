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

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) |
| Hosting | Vercel |
| Database / Auth | Supabase |
| Payments | Stripe |
| Video | Vimeo |
| Audio ingestion | Google Drive → S3 |
| Private podcast feed | Castos |
| Email automation | ActiveCampaign |
| SMS | Twilio |

---

## Architecture Notes

### Source of Truth

Supabase is the single source of truth for:

- Member identity
- Subscription status
- Content access
- Progress tracking
- Journaling
- Engagement data

### Billing Access Model

Stripe drives billing state. All access decisions are enforced server-side. Client-side subscription state is never trusted.

### Daily Audio Pipeline

1. Dr. Paul uploads audio to a designated Google Drive folder
2. The system ingests the file into S3
3. The file is transcribed
4. AI generates suggested title, description, and tags
5. Admin reviews and approves content
6. Audio is published to:
   - The Positives platform
   - The private member podcast feed via Castos

### Video Delivery

Vimeo is the system of record for hosted video content, including workshops, monthly videos, and event replays.

---

## Membership Structure

### Level 1 — Membership
- Daily audio
- Weekly principles
- Monthly themes
- Content library
- Private podcast feed

### Level 2 — Membership + Events + Q&A
- Everything in Level 1
- Quarterly virtual events
- Q&A access
- Event replays

### Level 3 — Coaching Circle
- Everything in Levels 1 and 2
- Weekly group coaching
- Coaching replays
- Implementation support

### Level 4 — Executive Coaching
- Everything in Levels 1–3
- Bi-weekly 1:1 coaching
- Personalized support

---

## Product Modules

- Daily Practice Engine
- Content Library
- Journal
- Community / Q&A
- Coaching System
- Admin Dashboard
- Analytics & Retention

---

## Member Retention Features

- Daily streak tracking
- Reflection prompts
- Private journal
- Milestone celebrations
- Engagement reminders

---

## Build Priorities

1. Auth
2. Stripe subscriptions + webhook handling
3. Access middleware
4. Daily audio player
5. Google Drive ingestion pipeline
6. S3 storage workflow
7. Transcription + AI metadata generation
8. Castos publishing
9. Journal system
10. Content library
11. Vimeo integration
12. Community / Q&A
13. Coaching
14. Admin dashboard
15. Analytics

---

## Repository Standards

This repository maintains the following standards:

- Mobile-first UX
- Calm, low-cognitive-load interface
- Server-enforced access control
- Clean separation between ingestion, publishing, and delivery
- Architecture that is easy for AI agents and human developers to extend safely

---

## Related Internal Documents

This repo is built from three core planning documents:

- North Star Documentation
- AI Technical Build Specification
- Agent Roles & Responsibilities Specification

These should be kept up to date as the product evolves.

---

## Status

This project is in active development. The current focus is building a clean, durable foundation aligned with the current product architecture.

---

## License

Private project. All rights reserved.