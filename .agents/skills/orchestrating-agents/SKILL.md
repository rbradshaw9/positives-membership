---
name: orchestrating-agents
description: Implements multi-agent orchestration and context-driven development workflows for the Positives platform. Use when building complex product features, coordinating full-stack implementation, operating ingestion and publishing workflows, hardening security, or assigning specialized AI roles across content, platform, and growth systems.
---

# Agent Orchestration & Workflow Automation

## When to use this skill
- When building complex or full-stack Positives features that span database, backend, frontend, content delivery, admin tooling, or billing.
- When coordinating product systems that involve multiple integrations such as Supabase, Stripe, Vimeo, Google Drive, S3, Castos, ActiveCampaign, and Twilio.
- When implementing or debugging the daily audio ingestion pipeline, publishing workflows, private podcast delivery, access control, or retention systems.
- When conducting security reviews, architecture reviews, or systemic debugging across the platform.
- When assigning specialized AI agents to roles such as ingestion, metadata generation, publishing, moderation, analytics, coaching operations, or growth.
- When generating implementation plans, technical specs, milestone plans, or architecture documentation for Positives.

## Workflow

- [ ] **1. Product Context & Role Assignment**
  - Establish the current product context for Positives before doing any work.
  - Confirm the core product model:
    - Positives is a practice-based membership platform
    - the daily audio practice is the center of the experience
    - the product should feel like a gym for personal growth, not a course portal
    - members should never feel behind
  - Determine which agent personas are needed for the task. Common roles include:
    - `product-architect`
    - `backend-engineer`
    - `frontend-engineer`
    - `database-architect`
    - `billing-engineer`
    - `security-auditor`
    - `ingestion-agent`
    - `metadata-agent`
    - `publishing-agent`
    - `podcast-agent`
    - `analytics-agent`
    - `growth-agent`
    - `moderation-agent`
    - `qa-reviewer`

- [ ] **2. System Boundary Check**
  - Before planning implementation, confirm which systems are involved.
  - Positives technology assumptions:
    - **Frontend:** Next.js
    - **Hosting:** Vercel
    - **Database/Auth:** Supabase
    - **Payments:** Stripe
    - **Video Hosting:** Vimeo
    - **Audio Source:** Google Drive
    - **Audio Storage / Processing:** S3
    - **Private Podcast Delivery:** Castos
    - **Email Automation:** ActiveCampaign
    - **SMS / Transactional Messaging:** Twilio
  - Supabase is the single source of truth.
  - Stripe is authoritative for subscription state.
  - Access control must always be enforced server-side.

- [ ] **3. Phase & Track Planning**
  - Generate a structured specification before implementation.
  - Break work into tracks or epics. Typical tracks for Positives:
    - Authentication & Access
    - Billing & Webhooks
    - Daily Practice Engine
    - Audio Ingestion Pipeline
    - AI Metadata Generation
    - Publishing & Podcast Delivery
    - Content Library
    - Journal & Reflection
    - Community / Q&A
    - Coaching Operations
    - Admin Dashboard
    - Analytics & Retention
    - Growth Systems
  - For each track, define:
    - objective
    - dependencies
    - data model impact
    - API impact
    - UI impact
    - admin impact
    - security impact

- [ ] **4. Multi-Agent Execution**
  - Treat every feature as a pipeline with explicit handoffs.
  - Example full-stack Positives pipeline:
    - Database schema
    - RLS / access policy
    - backend services
    - webhook / async job logic
    - frontend routes and components
    - admin tools
    - analytics instrumentation
    - QA / review
  - Example ingestion pipeline:
    - detect Google Drive upload
    - ingest source asset into S3
    - transcribe audio
    - generate AI metadata
    - create/update content record
    - notify admin for review
    - publish to platform
    - publish to Castos private feed

- [ ] **5. Multi-Perspective Review**
  - Review the implementation through multiple lenses:
    - architecture
    - security
    - billing correctness
    - data integrity
    - performance
    - mobile UX
    - operational maintainability
  - Use different personas during review rather than blending concerns together.

- [ ] **6. Documentation & System Memory**
  - Update product and system documentation as part of the workflow.
  - For significant changes, document:
    - intent
    - architecture decisions
    - table changes
    - API routes
    - background jobs
    - admin workflows
    - failure states
  - Keep North Star, technical spec, and agent roles aligned with implementation.

## Instructions

### Context-Driven Development
Always begin from the Positives product model, not just the codebase.

Key assumptions:
- Positives is a daily practice platform
- the daily audio player is the most important experience
- content is organized by rhythm:
  - Today
  - This Week
  - This Month
- members should never feel like they are completing a curriculum
- the UX should feel calm, supportive, and low-friction

### Modularity
Treat each feature as a modular pipeline.

Examples:

#### Membership Access Pipeline
Stripe webhook → Supabase member update → server-side access enforcement → UI state

#### Daily Audio Publishing Pipeline
Google Drive upload → S3 ingestion → transcription → AI metadata generation → admin review → Castos publish → member delivery

#### Coaching Operations Pipeline
session creation → Zoom/Vimeo asset association → reminders → replay publishing → analytics tracking

Do not collapse multiple concerns into one opaque implementation.

### Hypothesis-Driven Debugging
When debugging incidents, explicitly list at least 3 hypotheses before investigating.

Example incident classes:
- Stripe access mismatch
- daily audio not published
- Castos feed not updated
- playback broken on mobile
- missing Vimeo replay
- admin review stuck
- streak count incorrect

Adopt a multi-agent debugging mindset:
- `billing-agent` checks Stripe state
- `database-agent` checks Supabase records
- `ingestion-agent` checks job chain
- `frontend-agent` checks UI and route behavior
- `security-agent` checks access and auth assumptions

### Granular Focus
Do not mix concerns across review phases.

A security phase should focus only on:
- auth flows
- RLS
- secret handling
- webhook verification
- server-side authorization

A performance phase should focus only on:
- audio load time
- route latency
- query efficiency
- render behavior
- mobile playback behavior

A product phase should focus only on:
- cognitive load
- habit reinforcement
- daily-practice clarity
- user flow simplicity

## Standard Agent Roles for Positives

### `product-architect`
Responsible for:
- product/system alignment
- feature decomposition
- ensuring implementation matches the Positives North Star

### `database-architect`
Responsible for:
- Supabase schema
- migrations
- indexes
- data integrity
- RLS policies

### `backend-engineer`
Responsible for:
- API routes
- server actions
- service layers
- webhook handlers
- async jobs

### `frontend-engineer`
Responsible for:
- member routes
- admin routes
- UI state
- mobile-first UX
- audio player integration

### `billing-engineer`
Responsible for:
- Stripe products/prices
- webhook correctness
- membership tier mapping
- billing portal flows
- access provisioning/revocation

### `ingestion-agent`
Responsible for:
- Google Drive detection
- source asset ingestion to S3
- job chaining
- ingestion status tracking

### `metadata-agent`
Responsible for:
- transcription
- title generation
- description generation
- tagging
- content enrichment

### `publishing-agent`
Responsible for:
- content record creation
- approval workflow
- platform publish state
- scheduling and release logic

### `podcast-agent`
Responsible for:
- Castos publishing
- private feed delivery
- episode metadata sync
- failure handling and retries

### `content-ops-agent`
Responsible for:
- Vimeo asset attachment
- workshop and replay publishing
- library organization

### `moderation-agent`
Responsible for:
- Q&A / community content review
- spam detection
- unsafe or inappropriate content flagging

### `coaching-ops-agent`
Responsible for:
- session scheduling
- replay handling
- reminder workflows
- coaching content lifecycle

### `analytics-agent`
Responsible for:
- event tracking
- retention signals
- streak analysis
- conversion metrics
- reporting

### `growth-agent`
Responsible for:
- affiliate flow support
- acquisition reporting
- content repurposing workflows
- lifecycle optimization hooks

### `security-auditor`
Responsible for:
- secret handling
- webhook verification
- RLS review
- authorization correctness
- dependency and data exposure review

### `qa-reviewer`
Responsible for:
- edge-case review
- regression review
- mobile interaction testing
- member/admin flow validation

## Positives-Specific Orchestration Rules

### Rule 1: Daily Audio First
If a task competes with the daily practice experience, prioritize the daily practice experience.

### Rule 2: Server-Side Access Only
Never rely on client-side subscription checks for protected content.

### Rule 3: Preserve Calm UX
Do not introduce patterns that make the experience feel cluttered, course-like, or operationally noisy.

### Rule 4: Respect System Boundaries
- Google Drive = human input layer
- S3 = storage and processing layer
- Castos = private podcast delivery layer
- Vimeo = video delivery layer
- Supabase = source of truth
- Stripe = billing truth

### Rule 5: No “Behind” Mechanics
Avoid implementation patterns that introduce completion pressure, progress shame, or course-completion psychology.

### Rule 6: Review Async Workflows Explicitly
Any ingestion, publishing, reminder, webhook, or analytics workflow must include:
- trigger
- worker/job
- expected outputs
- retry behavior
- failure handling
- admin visibility

## Recommended Execution Patterns

### Full-Stack Feature Pattern
1. clarify product intent
2. define schema changes
3. define access rules
4. define API / service contract
5. implement UI
6. implement admin controls
7. instrument analytics
8. review security
9. review UX
10. document changes

### Incident Response Pattern
1. define incident
2. list hypotheses
3. inspect source-of-truth systems first
4. isolate the failing stage
5. patch minimally
6. validate downstream impact
7. document root cause

### Refactor Pattern
1. document current behavior
2. define target behavior
3. identify data contract risks
4. refactor one layer at a time
5. validate member flows
6. validate admin flows
7. validate billing and access

## Outputs This Skill Should Produce

When used correctly, this skill should help generate:

- phased implementation plans
- architecture decision records
- feature specs
- migration plans
- API contracts
- async job specs
- system diagrams
- code review plans
- security audit checklists
- debugging plans
- multi-agent responsibility maps

## Resources

Use the Positives internal project documents as the source of truth:

- **North Star Documentation**
- **AI Technical Build Specification**
- **Agent Roles & Responsibilities Specification**
- **Brand Identity & Guidelines**
- **tech-stack.md**
- **voice-tone.md**
- **design-tokens.json**

Do not invent architecture or workflows that conflict with those documents.