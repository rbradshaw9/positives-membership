# Docs Realignment Plan

> Audit of all project documentation against the actual codebase as of 2026-04-01.
> Goal: Make docs truthful without losing the long-term vision.

---

## Documents Audited

1. `POSITIVES_AI_CONTEXT.md` — AI working context (root)
2. `PROJECT_BRIEF.md` — Original project brief (root)
3. `CONTRIBUTING.md` — Development guidelines (root)
4. `MILESTONE_01_FOUNDATION.md` — Initial milestone spec (root)
5. `README.md` — Repository overview (root)
6. `docs/positives-platform-roadmap.md` — Full roadmap & architecture
7. `docs/member-experience-implementation-plan.md` — Member experience spec
8. `docs/sprint-1-build-plan.md` — Sprint 1 detailed plan
9. `docs/sprint-1-2-planning-memo.md` — Sprint 1–2 planning memo

---

## 1. POSITIVES_AI_CONTEXT.md

**Purpose:** Primary AI context doc for starting new threads. This is the most important file to keep accurate.

| Section | Status | Notes |
|---------|--------|-------|
| §1 Platform Overview | ✅ Accurate | Core philosophy matches code |
| §2 Core Technology Stack | ⚠️ Partially outdated | Lists Resend and ActiveCampaign as part of stack — neither has any code. Lists pgvector/OpenAI embeddings — tables exist but no code uses them. |
| §3 Subscription Tiers | ⚠️ Partially outdated | Lists 4 tiers correctly. References `content.tier_min` — **column does not exist yet** |
| §4 Core Database Tables | ❌ Outdated | `member` table lists `onboarding_completed_at` — **does not exist**. `content` table lists `tier_min` — **does not exist**. Lists `coaching_call` and `event` as content types — **not in enum**. `progress` table shows `completed_at` — actual column is `listened_at`. Activity events list `event_rsvp` and `qa_posted` — **not in enum**. |
| §5 Core Product Features | ⚠️ Partially outdated | "Sprints 1–9 delivered" is correct. Engagement tracking list is correct except overstates what events are actively fired. |
| §6 Key Architecture Principles | ✅ Accurate | All 5 principles match current implementation |
| §7 Coaching System | ❌ Aspirational | Describes `/coaching` page, `coaching_call` type, `tier_min` gating. **None of this exists in code.** |
| §8 Library System | ⚠️ Partially outdated | Core is accurate. Lists "coaching, events, resources, courses" in library types — only daily/weekly/monthly actually exist. |
| §9 Notes / Journal | ⚠️ Partially outdated | "Add Entry button" described — **does not exist in UI** |
| §10 AI System | ✅ Accurate | Correctly marked as "Planned" |
| §11 Email System | ❌ Aspirational | Describes Resend and ActiveCampaign — **zero integration code exists** |
| §12 Next Development Phases | ✅ Accurate | Phases 1–5 are reasonable forward-looking descriptions |
| §13 Current Development Target | ⚠️ Partially outdated | Says "Sprint 10" but nothing has been implemented yet for Sprint 10 |

### Recommended Changes

| Action | Details |
|--------|---------|
| **Edit §2** | Add "(planned)" after Resend, ActiveCampaign, and "OpenAI embeddings" |
| **Edit §3** | Add note: "`tier_min` column is planned but not yet in schema" |
| **Edit §4 member** | Remove `onboarding_completed_at` (add note: "planned for Sprint 12") |
| **Edit §4 content** | Add note under `tier_min`: "Not yet added — Sprint 10 migration will create this" |
| **Edit §4 content types** | Change `coaching_call` and `event` to clearly labeled "Planned additions" |
| **Edit §4 progress** | Fix column name: `completed_at` → `listened_at` + `completed` |
| **Edit §4 activity_event** | Replace `event_rsvp` / `qa_posted` with actual enum values from migration 0006 |
| **Edit §7** | Add opening note: "⚠️ Not yet implemented. Planned for Sprint 10." |
| **Edit §8** | Remove coaching/events/resources from library types. Add note about planned types. |
| **Edit §9** | Change "Journal page must include: Add Entry button" to "Journal page will include: Add Entry button (planned Sprint 10)" |
| **Edit §11** | Add "⚠️ Not yet implemented" header to both Resend and ActiveCampaign sections |

---

## 2. PROJECT_BRIEF.md

**Purpose:** Original product vision document. Written pre-development.

| Section | Status | Notes |
|---------|--------|-------|
| What This Product Is | ✅ Accurate | Philosophy still holds |
| Product Philosophy | ✅ Accurate | All 4 principles match code design |
| Core Experience Rhythm | ✅ Accurate | Daily/Weekly/Monthly implemented |
| Membership Structure | ✅ Accurate | 4 levels defined, match code mapping |
| Core Technology Choices | ⚠️ Partially outdated | Lists Twilio for SMS — no code. Lists ActiveCampaign — no code. Lists Google Drive for audio input — no ingestion code. |
| System Truth Rules | ✅ Accurate | Supabase + Stripe authority model matches |
| Daily Audio Pipeline | ❌ Aspirational | Describes full Google Drive → S3 → transcription → publish pipeline. Nothing built. |
| Product Modules | ⚠️ Partially outdated | Lists 9 modules. 5 are built (practice, library, journal, admin, analytics/retention). 4 are not (community, coaching, ingestion, podcast publishing). |
| Build Priorities | ❌ Outdated | Lists priorities 1–15. Actual build order diverged significantly (library and journal built before ingestion pipeline, Vimeo before community). |
| UX Guidance | ✅ Accurate | Still applies |
| Non-Negotiable Rules | ⚠️ Partially outdated | References Twilio (no code), Google Drive → S3 (no code) |

### Recommended Changes

| Action | Details |
|--------|---------|
| **Keep** | All philosophy, UX guidance, and system truth rules |
| **Edit** | Tech stack section: add "(planned)" after Twilio, ActiveCampaign |
| **Edit** | Daily Audio Pipeline: add note "Not yet implemented — planned Phase 3" |
| **Edit** | Build Priorities: mark completed items, reorder remaining |
| **Edit** | Non-Negotiable Rules: soften language around unbuilt integrations (Castos, Twilio) |

---

## 3. CONTRIBUTING.md

**Purpose:** Development process guidelines.

| Section | Status | Notes |
|---------|--------|-------|
| Core Rules | ⚠️ Partially outdated | "Google Drive → S3 is the audio ingestion path" and "Castos is the private podcast delivery layer" — neither built |
| Product Rules | ✅ Accurate | All still apply |
| Branch Naming | ✅ Accurate | Good conventions |
| File/Migration Naming | ✅ Accurate | Matches actual code |
| Documentation Expectations | ✅ Accurate | Still relevant |
| Testing Expectations | ✅ Accurate | Still relevant |
| Scope Discipline | ✅ Accurate | "Do not overbuild" is critical |

### Recommended Changes

| Action | Details |
|--------|---------|
| **Edit** | Core Rules: change ingestion/podcast items to "planned" language |
| **Keep** | Everything else unchanged |

---

## 4. MILESTONE_01_FOUNDATION.md

**Purpose:** Original spec for the first milestone.

**Overall Status:** ✅ **Fully completed and superseded.** All deliverables have been implemented. This document is historical.

### Recommended Changes

| Action | Details |
|--------|---------|
| **Keep** | As historical reference |
| **Add** | Header note: "✅ Milestone 01 is complete. This document is retained as historical reference." |

---

## 5. README.md

**Purpose:** Repository entry point for developers.

| Section | Status | Notes |
|---------|--------|-------|
| Product Summary | ✅ Accurate | |
| Core Principles | ✅ Accurate | |
| Tech Stack | ⚠️ Partially outdated | Lists Twilio, ActiveCampaign, Castos as "current" — none have code |
| Architecture Notes | ⚠️ Partially outdated | Daily Audio Pipeline described as if built — it's not |
| Membership Structure | ✅ Accurate | |
| Product Modules | ⚠️ Partially outdated | Lists all 7 as active — Community/Q&A and Coaching not built |
| Member Retention Features | ⚠️ Partially outdated | "Milestone celebrations" and "Engagement reminders" not built |
| Build Priorities | ❌ Outdated | Lists items 1–15 in original order. Actual development diverged. |
| Status | ❌ Outdated | "building a clean, durable foundation" — already well past foundation |

### Recommended Changes

| Action | Details |
|--------|---------|
| **Edit** | Tech stack: add "(planned)" labels to unbuilt integrations |
| **Edit** | Architecture: add "Planned — Not yet implemented" header to Daily Audio Pipeline |
| **Edit** | Product Modules: label each as "Built" or "Planned" |
| **Edit** | Build Priorities: replace with sprint-based progress summary |
| **Edit** | Status: update to "Sprints 1–9 complete. Preparing Sprint 10." |
| **Remove** | SMS / Twilio mention entirely (never discussed in recent planning) |

---

## 6. docs/positives-platform-roadmap.md

**Purpose:** Canonical forward-looking roadmap document. **Most comprehensive doc in the repo.**

| Section | Status | Notes |
|---------|--------|-------|
| §1 Current System Overview | ✅ Accurate | Detailed, matches code well |
| §1.1–1.10 Subsystem Status | ✅ Accurate | Each subsystem correctly described |
| §2 Phase 1 (Core + Coaching + Tiers) | ⚠️ Aspirational | Well-designed but nothing implemented yet. Describes it as "next 2–4 weeks" |
| §2 Phase 1.5 (Onboarding) | ⚠️ Aspirational | Not implemented |
| §2 Phase 2 (Community) | ⚠️ Aspirational | Not implemented |
| §2 Phase 3 (Ingestion) | ⚠️ Aspirational | Not implemented |
| §2 Phase 4 (AI) | ⚠️ Aspirational | Not implemented |
| §2 Phase 5 (Growth) | ⚠️ Aspirational | Not implemented |
| §3 Admin Completion Plan | ⚠️ Partially outdated | "Current State (Built)" section is accurate. "Must Build" items are all still unbuilt. |
| §4–9 Future Systems | ✅ Future-phase language | Support, email, ingestion, AI, community, ops — all correctly labeled as planned |

### Recommended Changes

| Action | Details |
|--------|---------|
| **Keep** | §1 (Current Overview) — it's the best summary in the repo |
| **Keep** | §2 Phase descriptions — they're well-written future specs |
| **Edit** | Add a "Last verified" date and note at the top: "§1 verified against code on 2026-04-01. Phases 1–5 are planned, not implemented." |
| **Edit** | Remove specific timeline estimates ("2–4 weeks") — they're stale |

---

## 7. docs/member-experience-implementation-plan.md

**Purpose:** Detailed member experience spec written pre-Sprint 1.

| Section | Status | Notes |
|---------|--------|-------|
| §1 Current-State Assessment | ❌ Outdated | Says weekly/monthly are "hardcoded placeholder text" — they've been query-driven since Sprint 1. Says library route is missing — built since Sprint 4. Says journal has "no UI" — built since Sprint 4. |
| §2 Product Architecture | ✅ Accurate | Core principle still holds |
| §3 Tier-Aware Navigation | ⚠️ Aspirational | Well-designed but no tier-aware nav exists yet |
| §4–12 Detailed specs | ⚠️ Mixed | Many items are now built, many are not. No distinction made. |
| §13 Phased Roadmap | ⚠️ Superseded | `positives-platform-roadmap.md` is now the canonical roadmap |

### Recommended Changes

| Action | Details |
|--------|---------|
| **Defer** | This doc is largely superseded by the platform roadmap. Keep for reference but add header: "⚠️ Partially superseded by `docs/positives-platform-roadmap.md`. §1 Current-State Assessment is outdated — see `CURRENT_IMPLEMENTATION_TRUTH.md`." |
| **Do not edit** | Line-by-line corrections would be high effort, low value. The roadmap is now canonical. |

---

## 8. docs/sprint-1-build-plan.md

**Purpose:** Sprint 1 detailed build plan.

**Overall Status:** ✅ **Completed and superseded.** This is historical documentation.

### Recommended Changes

| Action | Details |
|--------|---------|
| **Keep** | As historical reference |
| **Add** | Header note: "✅ Sprint 1 is complete." |

---

## 9. docs/sprint-1-2-planning-memo.md

**Purpose:** Sprint 1–2 planning memo.

**Overall Status:** ✅ **Completed and superseded.**

### Recommended Changes

| Action | Details |
|--------|---------|
| **Keep** | As historical reference |
| **Add** | Header note: "✅ Sprints 1–2 are complete." |

---

## Priority Edit Order

Based on impact (how often the doc is used × how wrong it is):

| Priority | Document | Effort |
|----------|----------|--------|
| 1 | `POSITIVES_AI_CONTEXT.md` | Medium — most-used doc, most inaccuracies |
| 2 | `README.md` | Low — entry point, quick fixes |
| 3 | `CONTRIBUTING.md` | Low — 2 line changes |
| 4 | `PROJECT_BRIEF.md` | Low — add "planned" labels |
| 5 | `MILESTONE_01_FOUNDATION.md` | Trivial — add completed header |
| 6 | `docs/member-experience-implementation-plan.md` | Trivial — add superseded header |
| 7 | Completed sprint docs | Trivial — add completed header |
| 8 | `docs/positives-platform-roadmap.md` | Low — add verified date, remove timelines |
