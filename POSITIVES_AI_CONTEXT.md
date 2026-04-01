# POSITIVES_AI_CONTEXT.md

*(Condensed AI Working Context)*

## 1. Platform Overview

**Positives** is a membership platform built around a daily personal
growth practice led by Dr. Paul Jenkins.

Members return daily to:

-   listen to a short practice
-   reflect with optional journaling
-   engage with deeper weekly/monthly teachings

The product is designed to feel like a **gym for mindset practice**, not
a course platform.

Core principles:

-   members never feel behind
-   daily practice is always the center
-   calm experience \> feature complexity
-   depth is optional, never forced

------------------------------------------------------------------------

# 2. Core Technology Stack

Frontend\
- Next.js (App Router)

Hosting\
- Vercel

Database + Auth\
- Supabase (Postgres + Supabase Auth)

Billing\
- Stripe

Video\
- Vimeo

Audio Hosting\
- S3 (primary) - Castos (private podcast feed)

Email\
- Resend → transactional\
- ActiveCampaign → lifecycle automation

Vector / AI - pgvector - OpenAI embeddings

------------------------------------------------------------------------

# 3. Subscription Tiers

Level 1 -- Core Practice\
Level 2 -- Positives Plus\
Level 3 -- Positives Circle\
Level 4 -- Executive Coaching

Tier access is stored on:

member.subscription_tier

Content gating uses:

content.tier_min

Server-side rule:

tier_min IS NULL OR tier_min \<= member.subscription_tier

Client UI **never enforces access control**.

------------------------------------------------------------------------

# 4. Core Database Tables

### member

id\
email\
subscription_status\
subscription_tier\
practice_streak\
last_practiced_at\
onboarding_completed_at

------------------------------------------------------------------------

### content (primary publishing model)

This is the **canonical content system**.

All member-facing material is modeled here whenever possible.

Fields:

id\
type\
title\
description\
excerpt\
body

status\
publish_date\
week_start\
month_year

tier_min

s3_audio_key\
castos_episode_url\
vimeo_video_id\
youtube_video_id\
download_url

reflection_prompt\
resource_links

transcription\
search_vector\
tags

Current content types:

daily_audio\
weekly_principle\
monthly_theme\
coaching_call\
event

Important rule:

Do NOT create separate tables for coaching calls, events, replays, etc
unless absolutely necessary.

Everything should remain compatible with:

-   search
-   notes
-   AI embeddings
-   recommendations
-   library browsing
-   admin CRUD

------------------------------------------------------------------------

### journal

Stores member notes.

Supports both:

-   notes attached to content
-   freeform journal entries

Fields:

id\
member_id\
content_id (nullable)\
entry_text\
created_at\
updated_at

------------------------------------------------------------------------

### progress

Tracks practice completion.

member_id\
content_id\
completed\
completed_at

------------------------------------------------------------------------

### activity_event

Append-only engagement log.

Examples:

daily_listened\
weekly_viewed\
monthly_viewed\
note_created\
event_rsvp\
qa_posted

Used for:

-   analytics
-   email triggers
-   streak logic

------------------------------------------------------------------------

# 5. Core Product Features (Completed)

Sprints 1--9 delivered:

Authentication - Supabase auth - Stripe subscription lifecycle

Today Page - daily practice - weekly principle - monthly theme - audio
player with completion tracking

Library - full content archive - search - type filters

Journal - contextual notes - notes archive page

Admin System - content CRUD - resource links - media embeds

Engagement Tracking - progress - activity events - streak system

Member UI - premium nav - hero section - card design system

Vector Foundation - embedding tables created

------------------------------------------------------------------------

# 6. Key Architecture Principles

### 1. Unified Content Model

Everything member-facing should ideally be represented as **content**.

Examples:

daily practice\
weekly teaching\
monthly theme\
coaching replay\
live event replay\
bonus lesson\
workshop

Avoid creating separate parallel systems.

------------------------------------------------------------------------

### 2. Server-Side Authorization

All gating happens server-side.

Never trust client state.

------------------------------------------------------------------------

### 3. Daily Practice is the Center

All features support the daily habit.

The Today page hierarchy always stays:

Daily\
Weekly\
Monthly\
Secondary cards

------------------------------------------------------------------------

### 4. Calm UX

The platform should feel like:

meditation app\
not SaaS dashboard

------------------------------------------------------------------------

### 5. Members Never Fall Behind

No:

-   course progress bars
-   completion percentages
-   guilt-driven reminders

Practice is cyclical.

------------------------------------------------------------------------

# 7. Coaching System

Weekly coaching calls exist for:

Level 3\
Level 4

Structure:

/coaching

Shows:

next call\
join button\
replay archive

Implementation:

content.type = coaching_call\
tier_min = level_3

Zoom setup:

-   one recurring meeting
-   same link every week
-   waiting room enabled
-   no registration
-   link only visible inside member area

Replay:

-   uploaded to Vimeo
-   stored on content record

------------------------------------------------------------------------

# 8. Library System

Library shows all published content.

Types include:

daily\
weekly\
monthly\
coaching\
events\
resources\
courses (future)

Features:

search\
filters\
notes indicator\
pagination

Future enhancements:

semantic search\
AI recommendations\
course collections

------------------------------------------------------------------------

# 9. Notes / Journal

Members can write notes in two ways:

1.  Contextual reflection from content cards\
2.  Freeform entry from the Journal page

Journal page must include:

Add Entry button

Notes may have:

content_id OR NULL

------------------------------------------------------------------------

# 10. AI System (Planned)

Vector tables already exist:

content_embedding\
content_chunk

Future features:

semantic search\
content recommendations\
AI assistant (RAG)\
auto tagging

Embeddings generated from transcripts.

------------------------------------------------------------------------

# 11. Email System

Two separate systems.

Transactional

Resend

Examples:

welcome\
password reset\
payment receipt\
milestones\
event reminders

Lifecycle / marketing

ActiveCampaign

Examples:

onboarding\
engagement reminders\
upgrade nurture\
weekly digest

------------------------------------------------------------------------

# 12. Next Development Phases

### Phase 1

Core completion.

Includes:

tier gating\
coaching system\
admin calendar\
member viewer\
seed content\
today page improvements

------------------------------------------------------------------------

### Phase 1.5

Onboarding.

first login flow\
first practice guide\
7-day email lifecycle

------------------------------------------------------------------------

### Phase 2

Community.

events\
Q&A\
upgrade prompts\
support system

------------------------------------------------------------------------

### Phase 3

Content automation.

audio ingestion pipeline\
transcription\
AI enrichment\
podcast publishing

------------------------------------------------------------------------

### Phase 4

AI layer.

semantic search\
content recommendations\
AI assistant

------------------------------------------------------------------------

### Phase 5

Growth systems.

referrals\
annual billing\
mobile app\
advanced analytics

------------------------------------------------------------------------

# 13. Current Development Target

Next sprints:

Sprint 10\
Sprint 11\
Sprint 12

Focus areas include:

tier gating\
coaching system\
notes page improvements\
seed content\
admin improvements\
onboarding

------------------------------------------------------------------------

# How to Use This File

When starting a new AI development thread:

Upload:

POSITIVES_AI_CONTEXT.md\
implementation_plan.md

Then begin with:

Use this document as the system context.\
We are continuing development of the Positives platform.\
All prior sprints are complete.\
We are implementing Sprint 10.
