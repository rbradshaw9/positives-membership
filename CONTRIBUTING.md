# Contributing Guidelines

## Purpose

This repository is for the Positives platform.

All work should align with:
- the North Star
- the technical build specification
- the agent roles specification
- the brand identity guidelines

## Core Rules

- Supabase is the source of truth
- Stripe is authoritative for billing state
- Access control is server-side only
- Mux is the primary video host (Vimeo is legacy fallback for pre-Mux content)
- Google Drive → S3 is the audio ingestion path (planned — pipeline not yet built)
- Castos is the private podcast delivery layer (planned — no integration code yet)

## Product Rules

- Positives is a daily practice platform
- the daily audio experience is the highest priority
- members should never feel behind
- the UI should remain calm, simple, and mobile-first
- do not make the product feel like a course portal

## Branch Naming

Use:
- `feature/<name>`
- `fix/<name>`
- `refactor/<name>`
- `docs/<name>`

Examples:
- `feature/foundation-shell`
- `fix/stripe-webhook-verification`
- `docs/project-brief`

## File Naming

Prefer:
- kebab-case for file names
- singular names for service modules where appropriate
- clear route-based naming in `app/`

## Migration Naming

Use timestamped or ordered migration names.

Examples:
- `0001_initial_schema.sql`
- `0002_rls_policies.sql`

## Documentation Expectations

When changing architecture, schema, or workflow behavior, update the corresponding docs.

Document:
- intent
- impacted files
- affected systems
- migration implications
- risks or follow-up items

## Testing Expectations

Do not claim work is complete without evidence.

Use:
- automated tests where practical
- manual verification notes where needed
- webhook replay verification for billing flows
- route-access verification for protected content

## Scope Discipline

Do not overbuild.

Implement only the milestone or task at hand.

Avoid speculative abstractions unless they clearly support known upcoming work.