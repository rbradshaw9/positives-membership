---
name: using-superpowers
description: Implements the Positives development workflow for structured, plan-based, test-backed execution. Use when starting a new feature, fixing a bug, refactoring a system, or implementing a new pipeline so work stays aligned with the Positives North Star, technical spec, and agent orchestration rules.
---

# Structured Development Workflow

## When to use this skill
- When starting a new Positives feature or subsystem.
- When fixing bugs in billing, access control, ingestion, publishing, journaling, coaching, or analytics.
- When refactoring a route, service, schema, or background workflow.
- When implementing any production logic that touches Supabase, Stripe, Vimeo, Google Drive, S3, Castos, ActiveCampaign, or Twilio.
- When a structured plan, validation steps, or test-first execution approach is needed.

## Workflow
Follow these phases in order. Do not skip steps unless the task is truly trivial.

- [ ] **1. Clarify Product Intent**
  - Do not jump into code immediately.
  - Start by identifying what the feature or fix is supposed to accomplish inside Positives.
  - Validate that the work aligns with core product constraints:
    - Positives is a daily practice platform
    - the daily audio experience is the highest priority
    - members should never feel behind
    - the product should feel calm and low-friction
    - access is enforced server-side
  - Identify which system boundaries are involved:
    - Supabase
    - Stripe
    - Vimeo
    - Google Drive
    - S3
    - Castos
    - ActiveCampaign
    - Twilio

- [ ] **2. Define the Smallest Correct Scope**
  - Break the work into the smallest meaningful slice that can be implemented safely.
  - Prefer vertical slices over giant horizontal rewrites.
  - Define:
    - user outcome
    - admin outcome
    - system outcome
    - affected routes
    - affected tables
    - affected jobs/workers
    - affected integrations

- [ ] **3. Create a Concrete Implementation Plan**
  - Write the plan before changing code.
  - Break the work into bite-sized tasks.
  - For each task, specify:
    - exact files to create or modify
    - exact behavior to add or change
    - required tests or checks
    - verification method
  - Keep tasks small enough to validate independently.

- [ ] **4. Establish a Safe Working State**
  - Work from an isolated branch when applicable.
  - Confirm the starting state is understood before changing anything.
  - For bug fixes, identify current behavior and expected behavior separately.
  - For refactors, document what must remain unchanged.

- [ ] **5. Implement with Test-Backed Validation**
  - Work task-by-task.
  - Use a RED → GREEN → REFACTOR approach whenever tests are practical.
  - If formal tests are not yet available, define an explicit validation step before claiming success.
  - Do not claim a feature works unless it has been verified through:
    - automated test
    - integration test
    - manual validation with clear evidence
    - webhook/event replay
    - database assertion
    - admin flow validation
    - member flow validation

- [ ] **6. Review Against Product and System Rules**
  - Before finishing, review the work against:
    - Positives North Star
    - technical architecture
    - access control rules
    - async workflow integrity
    - mobile-first UX
    - calm UI requirements
  - Confirm the implementation did not introduce:
    - course-like UX
    - client-side access assumptions
    - hidden coupling across services
    - unclear failure states

- [ ] **7. Finish with Explicit Outcomes**
  - Summarize:
    - what changed
    - what was verified
    - any follow-up risks
    - any next logical task
  - If this is git-based work, present the result in a branch/PR-ready format.

## Instructions

### Systematic over ad hoc
Prefer process over improvisation.

Every non-trivial Positives task should move through:
1. intent
2. scope
3. plan
4. implementation
5. verification
6. review

### Simplicity over cleverness
Make the simplest thing that is correct.

Avoid:
- premature abstraction
- unnecessary indirection
- speculative architecture
- giant refactors without boundaries

Follow:
- DRY where useful
- YAGNI aggressively
- explicit contracts over hidden magic

### Build around product truth
All implementation must support the Positives experience model:

- daily audio is the center of the platform
- the interface should guide members to Today’s Practice
- the product is cyclical, not linear
- members should not feel behind
- habit reinforcement should feel supportive, not manipulative

### Respect architectural truth
Core rules:

- Supabase is the source of truth
- Stripe is authoritative for billing state
- access control is enforced server-side
- Vimeo is the video host
- Google Drive is the human input layer for daily audio
- S3 is the audio storage and processing layer
- Castos is the private podcast delivery layer

Do not implement patterns that conflict with these assumptions.

## Positives-Specific Execution Patterns

### Full-Stack Feature Pattern
Use this for features like journal, community, coaching, library, admin, or Today view improvements.

1. clarify product intent
2. define schema impact
3. define access rules
4. define API/service behavior
5. implement UI
6. implement admin workflow if needed
7. instrument analytics
8. validate member flow
9. validate admin flow
10. document changes

### Async Workflow Pattern
Use this for ingestion, publishing, reminders, metadata generation, webhook handling, and background jobs.

1. define trigger
2. define job stages
3. define expected outputs
4. define retry behavior
5. define failure handling
6. define admin visibility
7. test each stage independently
8. validate end-to-end chain

Example:
Google Drive upload → ingest to S3 → transcribe → generate metadata → create content record → admin review → publish to Castos → member delivery

### Billing / Access Pattern
Use this for subscriptions, gating, membership tiers, and billing portal flows.

1. define Stripe event source
2. define Supabase state mutation
3. define access rule enforcement
4. define member-facing UI behavior
5. define failure or grace states
6. test with webhook scenarios
7. validate protected route behavior

### Debugging Pattern
When fixing a bug, list at least 3 hypotheses before changing code.

Examples:
- webhook signature verification failure
- stale Supabase membership state
- bad route guard logic
- ingestion job chain stopping before metadata step
- Castos publish succeeding but database not updating
- Vimeo asset attached incorrectly
- streak logic using wrong timezone boundary

Then:
1. inspect source-of-truth systems first
2. isolate the failing stage
3. patch the narrowest layer possible
4. validate downstream behavior
5. document root cause

## Verification Standards

Do not declare success without evidence.

Acceptable evidence includes:
- passing automated tests
- successful API response validation
- database assertions
- verified webhook replay
- confirmed route access behavior
- confirmed admin flow behavior
- confirmed member flow behavior
- validated mobile playback behavior

### Examples of required validation by subsystem

#### Daily Audio
- latest daily audio resolves correctly
- audio playback starts
- progress is written
- streak updates correctly
- mobile behavior is acceptable

#### Billing
- Stripe webhook updates member record
- protected routes respect current status
- canceled subscriptions lose access correctly
- past_due logic behaves as intended

#### Ingestion
- Google Drive file is detected
- asset is stored in S3
- transcription completes
- AI title/description are generated
- content record is created
- admin can review
- Castos publishing updates stored state

#### Vimeo
- video asset attaches correctly
- library/workshop replay renders properly
- access respects membership tier if applicable

## Planning Format

For non-trivial tasks, plans should include:

### Goal
What the feature or fix accomplishes.

### Scope
What is included and excluded.

### Files
Exact files to create or edit.

### Data
Tables, fields, or migrations involved.

### Services
APIs, jobs, webhooks, or integrations involved.

### Validation
How success will be verified.

### Risks
Known edge cases or follow-up items.

## Recommended Task Granularity

Tasks should usually be small enough to complete and verify in a few minutes each.

Good task examples:
- add `subscription_end_date` handling to Stripe webhook service
- create `/today` query that returns latest active daily audio
- add journal insert policy for authenticated member
- create admin review form for AI-generated title/description
- attach Vimeo replay ID to coaching session record

Bad task examples:
- build entire platform
- refactor all backend logic
- do all admin tools
- fix subscriptions

## Review Checklist

Before considering a task complete, confirm:

- product intent is preserved
- access control is server-side
- Supabase remains the source of truth
- async jobs have visible status or failure handling
- UI remains calm and low-friction
- members do not feel behind
- code is simpler or at least no more complex than necessary
- evidence exists for the claimed outcome

## Outputs This Skill Should Produce

When used correctly, this skill should generate:

- implementation plans
- refactor plans
- bug-fix plans
- test plans
- validation checklists
- migration steps
- feature slices
- safe rollout sequences
- post-change summaries

## Resources

Use the Positives internal documents as the source of truth:

- **North Star Documentation**
- **AI Technical Build Specification**
- **Agent Roles & Responsibilities Specification**
- **Brand Identity & Guidelines**
- **tech-stack.md**
- **voice-tone.md**
- **design-tokens.json**

Do not invent behavior, architecture, or workflows that conflict with those documents.