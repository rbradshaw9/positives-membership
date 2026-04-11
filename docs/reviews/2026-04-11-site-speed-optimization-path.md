# Positives Site Speed Optimization Path

Date: 2026-04-11
Owner: Codex

## Goal

Make the public site and member app feel faster without creating fragile complexity or pretending Positives is a full offline-first app.

## What We Already Improved

- Public marketing and legal routes were already moved to a more static-first model.
- Brand fonts are now self-hosted, so builds no longer depend on Google Fonts.
- FirstPromoter is already scoped more narrowly than before instead of loading everywhere.
- Google Analytics is now scoped to public layouts instead of loading from the root layout, so member and admin routes no longer pay that cost.
- The installable-app experience already has a manifest, icons, service worker registration, and an offline fallback page.

## Current Measured Baseline

Live Lighthouse performance runs against `positives.life` came back roughly:

- `/`: `64`
- `/join`: `66`
- `/watch`: `71`

Common patterns:

- Largest Contentful Paint is still slower than ideal on the core public pages.
- Total Blocking Time is already reasonably low, so the biggest problem is not a main-thread meltdown.
- The biggest recurring waste is unused JavaScript.

From the live Lighthouse report on `/`:

- shared public app chunk: about `114 KB` wasted
- Google Analytics script: about `65 KB` wasted

## Highest-Value Next Wins

### 1. Keep public pages static-first

This is still the strongest lever.

- Avoid reintroducing per-request session work on public routes unless it is truly necessary.
- Keep logged-in-user awareness in lightweight client behavior where possible.
- Be careful not to move marketing components back into heavier client-side patterns.

### 2. Reduce the shared public client chunk

This is the clearest remaining code-level opportunity.

- Inspect which public components are pulling more client code than needed.
- Prefer server-rendered marketing sections where interaction is not required.
- Keep client islands small and intentional.

### 3. Be selective with third-party scripts

Third-party scripts are still one of the easiest ways to quietly slow the site down.

- Google Analytics is now public-only, which is the right default.
- If we need more speed later, consider a lazier load strategy for GA after we confirm the attribution tradeoff is acceptable.
- Keep FirstPromoter limited to the smallest set of pages that truly need it.

### 4. Protect the member app from marketing overhead

The member experience should feel like a focused app, not a marketing site with extra baggage.

- Keep marketing analytics and growth scripts out of member and admin surfaces.
- Continue checking member layouts for unnecessary third-party or client-heavy code.

### 5. Watch media and visual payloads on funnel pages

The public pages are visually clean, but LCP still matters.

- Keep hero sections light.
- Prefer optimized images and avoid introducing autoplay-heavy media above the fold.
- Be careful with large decorative assets that do not change conversion meaningfully.

## Product Constraint

Positives does **not** need a full offline-first mode.

The right model is:

- installable and app-like where helpful
- honest offline fallback for the shell
- live data and audio still require a connection

That keeps the product simpler and avoids building a fake offline promise users do not need.

## Recommended Ongoing Budget

For launch-facing public routes:

- keep Lighthouse performance comfortably moving upward from the current mid-60s baseline
- treat new third-party scripts as expensive by default
- avoid adding large client-only sections to `/`, `/join`, `/watch`, and `/try`

## Suggested Next Execution Order

1. Keep shipping obvious shared UX polish wins like the mobile footer cleanup.
2. Audit the shared public chunk and identify the heaviest client imports still landing on funnel pages.
3. Re-run Lighthouse after each meaningful public-performance change instead of batching too much work together.
4. Keep installability as a polish/verification stream, not an offline-platform project.
