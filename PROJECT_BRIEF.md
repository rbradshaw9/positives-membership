# Positives Platform — Project Brief

Prepared by Ryan Bradshaw  
March 2026

## What This Product Is

Positives is a practice-based membership platform designed to help people cultivate greater positivity, emotional resilience, and peace in their daily lives.

It should feel like a **gym for personal growth**, not a course portal, LMS, or traditional coaching site.

Members do not complete Positives.

They return to it.

The daily habit is the center of the experience. Everything else — weekly principles, monthly themes, journaling, coaching, content library, events, and private podcast delivery — supports that daily rhythm.

## Product Philosophy

### Simplicity
Members should never feel overwhelmed.

Most days the primary action is simply:

**Listen to today’s audio.**

### Habit Formation
The daily practice is the most important behavior in the system.

### Emotional Support
The product should feel calm, supportive, grounded, and low-friction.

### No “Behind” Feeling
Members should never feel like they are behind or failing.
This is not a completion-based product.

## Core Experience Rhythm

- **Daily:** grounding audio from Dr. Paul
- **Weekly:** a principle and practice
- **Monthly:** a deeper theme

The interface should be organized around:

- Today
- This Week
- This Month

Not around modules, courses, or progress ladders.

## Membership Structure

### Level 1 — Membership
- daily audio
- weekly principles
- monthly themes
- content library
- private podcast feed

**Pricing display rule:** always show:
- Regular price: $97/month
- Offer price: $49/month

### Level 2 — Membership + Events + Q&A
- everything in Level 1
- quarterly virtual events
- Q&A access
- event replays

### Level 3 — Coaching Circle
- everything in Levels 1 and 2
- weekly group coaching
- coaching replays
- implementation support

### Level 4 — Executive Coaching
- everything in Levels 1–3
- bi-weekly 1:1 coaching
- personalized support

## Core Technology Choices

- **Frontend:** Next.js
- **Hosting:** Vercel
- **Database/Auth:** Supabase
- **Payments:** Stripe
- **Video Hosting:** Vimeo
- **Audio Input:** Google Drive
- **Audio Storage / Processing:** S3
- **Private Podcast Delivery:** Castos
- **Email Automation:** ActiveCampaign
- **SMS / Transactional Messaging:** Twilio

## System Truth Rules

### Supabase is the source of truth
Supabase is the single source of truth for:
- member identity
- content records
- subscription state mirrored from Stripe
- access control
- progress
- journaling
- engagement data

### Stripe is authoritative for billing state
Stripe drives subscription lifecycle.
Never trust client-side subscription state.

### Access control is server-side only
All protected content and route access decisions must be enforced server-side.

## Daily Audio Pipeline

Daily audio enters the system through a designated Google Drive folder, is ingested into S3 for storage and processing, enriched with transcription and AI-generated metadata, and then published to both the Positives platform and the private member podcast feed.

System boundary rules:
- Google Drive = human input layer
- S3 = storage and processing layer
- Castos = private podcast delivery layer
- Vimeo = video hosting layer
- Supabase = source of truth
- Stripe = billing truth

## Product Modules

The platform will eventually include:

- Daily Practice Engine
- Content Library
- Journal
- Community / Q&A
- Coaching System
- Admin Dashboard
- Analytics / Retention
- Audio Ingestion Pipeline
- Podcast Publishing Workflow

## Build Priorities

For now, do not build the entire platform.

Build in phases.

### Phase 1 / Milestone 1
- app foundation
- Supabase wiring
- authentication scaffold
- protected member route structure
- Stripe webhook scaffold
- schema v1
- `/today` page shell
- admin route shell
- environment variable contract

### Do Not Build Yet
Do not implement these in milestone 1:
- full ingestion pipeline
- journaling UX
- community / Q&A
- coaching system
- Castos publishing
- Vimeo library player
- ActiveCampaign flows
- Twilio flows
- advanced analytics

## UX Guidance

The product should feel like a premium wellness app.

Avoid:
- dense dashboards
- cluttered layouts
- SaaS-looking control panels in member-facing areas
- course completion language
- urgency-heavy copy

Prioritize:
- calm spacing
- obvious next action
- mobile-first layouts
- polished audio experience
- emotionally safe progress reinforcement

## Non-Negotiable Rules

- Positives must always feel like a daily practice platform
- the daily audio experience is the highest priority
- members must never feel behind
- Supabase is the source of truth
- Stripe is authoritative for subscription state
- access is enforced server-side
- Vimeo is the video host
- Google Drive → S3 is the audio ingestion path
- Castos is the private podcast delivery layer
- the first milestone should establish a clean foundation, not overbuild features