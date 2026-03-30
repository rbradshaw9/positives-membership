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

The daily habit is the center of the experience. Everything else — weekly principles, monthly themes, journaling, coaching, and events — supports that daily rhythm.

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
5. Easy navigation to library, coaching, and events

The daily audio player is the most important UI element in the product and should always feel prominent, polished, and easy to use on mobile.

## Technology Constraints

The Positives platform uses the following core technology choices:

- **Frontend:** Next.js
- **Hosting:** Vercel
- **Database/Auth:** Supabase
- **Payments:** Stripe
- **Video Hosting:** Vimeo
- **Audio Ingestion:** Google Drive → S3
- **Private Podcast Delivery:** Castos
- **Email Automation:** ActiveCampaign
- **SMS / Transactional Messaging:** Twilio

Supabase is the single source of truth for:

- member identity
- subscription state
- access control
- engagement data
- progress
- journal entries

Stripe controls billing state. Access decisions must always be enforced server-side.

## Content Pipeline Rules

Daily audio enters the system through a designated Google Drive folder, is ingested into S3 for storage and processing, enriched with transcription and AI-generated metadata, and then published to both the Positives platform and the private member podcast feed.

Video content is hosted in Vimeo.

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

## Membership Structure

### Level 1 — Membership
- daily audio
- weekly principles
- monthly themes
- content library
- private podcast feed

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

## Pricing Presentation Rules

When presenting the core membership price, always show:

- **Regular price:** $97/month
- **Offer price:** $49/month

Do not show the offer price in isolation.

Do not use dark patterns.

Members must always have clear access to billing management and cancellation through Stripe.

## Reference Documentation

Depending on the task you are performing, consult the specific resource files below. Do not guess brand elements; always read the corresponding file.

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

## Non-Negotiable Rules

- Positives must always feel like a daily practice platform
- The product must not feel like a course portal
- Members must never feel behind
- The daily audio player is the most important experience in the product
- The interface must remain calm, clear, and mobile-first
- Access control must be enforced server-side
- Supabase is the source of truth
- Stripe is authoritative for subscription state
- Vimeo is the video host
- Google Drive → S3 is the audio ingestion path
- Castos is the private podcast delivery layer