# Positives Asana Setup Guide

Prepared on April 10, 2026

## Purpose

This guide explains how to turn the Positives finish roadmap into an actual Asana project without rebuilding the structure by hand.

It is paired with:

- `docs/reports/2026-04-10-positives-finish-roadmap.md`
- `docs/reports/2026-04-10-positives-asana-import.csv`

## Recommended Project Name

Use:

`Positives Finish Roadmap`

## Project Sections

Create these sections in this order:

1. `Phase 0 — Repo Stabilization`
2. `Phase 1 — Content Model + Member Experience`
3. `Phase 2 — Affiliate + Email + Growth Systems`
4. `Phase 3 — Tier Features: Events + Coaching`
5. `Phase 4 — Marketing + Funnel Variants + Launch Polish`
6. `Phase 5 — Deferred / Post-Launch`
7. `Blocked / Needs Decision`

## Recommended Custom Fields

Create these fields before or after import:

### `Area`

Options:

- Marketing
- Today / Archive
- Library
- Affiliate
- Email / CRM
- Billing / Account
- Events / Coaching
- Admin / Content
- Funnels / Offers

### `Priority`

Options:

- P0
- P1
- P2

### `Status`

Options:

- Not started
- In progress
- Ready for review
- Blocked
- Done

### `Launch Gate`

Options:

- Yes
- No

### `Type`

Options:

- Bug
- Feature
- Polish
- Decision
- QA / Verification
- Experiment

## CSV Import Notes

The import file already includes these columns:

- `Name`
- `Section/Column`
- `Description`
- `Area`
- `Priority`
- `Status`
- `Launch Gate`
- `Type`

That means you can use the CSV import to create the initial task set and then map the columns to Asana fields during import.

## Recommended Import Flow

1. Create the new project in Asana.
2. Import `docs/reports/2026-04-10-positives-asana-import.csv`.
3. Map `Section/Column` to the section field during import.
4. Map the remaining columns into the matching custom fields.
5. After import, review the `Blocked / Needs Decision` section first so the team sees what still needs a product decision.

## Recommended Views

After import, create these views:

### Launch Gate View

Filter:

- `Launch Gate = Yes`
- `Status != Done`

Use this as the main launch-critical view.

### Current Sprint View

Filter:

- `Priority = P0` or `Priority = P1`
- `Status != Done`

Use this as the short-term execution view.

### Decision View

Filter:

- `Type = Decision`
- `Status != Done`

Use this to surface product and business decisions that block execution.

### Polishing View

Filter:

- `Type = Polish`
- `Status != Done`

Use this once the platform is stable and the team moves into finish-mode cleanup.

## Recommended Operating Rhythm

Use this project with a simple weekly rhythm:

- every week, choose only a small number of active P0 and P1 tasks
- do not pull Phase 4 work forward if Phase 0 or Phase 1 launch gates are still red
- treat `Blocked / Needs Decision` as a living conversation list
- move finished work to `Done` through the status field, not by deleting tasks

## Important Strategy Defaults

These assumptions are baked into the roadmap and CSV:

- finish order is foundation first
- blog is deferred
- default public offer remains paid membership plus a 30-day guarantee
- 7-day free trial is a targeted experiment, not the default sitewide offer
- ActiveCampaign and app-managed email each keep a defined role

## What This Does Not Do Yet

This package prepares the Asana project structure, but it does not create the live Asana project automatically.

If you want, the next step can be:

- manual CSV import into Asana, or
- an automated Asana setup script once API access is available
