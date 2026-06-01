# Member UX Audit - May 27, 2026

## Scope

Production URL: `https://positives.life`

Seeded accounts checked:

- Level 1: `rbradshaw+l1@gmail.com`
- Level 2: `rbradshaw+l2@gmail.com`
- Legacy Level 3 fixture: `rbradshaw+l3@gmail.com`

No seeded Level 4 member account was found, and that is no longer considered a
beta QA gap if the current product model stays at two public membership levels.

The pass covered 26 authenticated routes per account, including Today, Practice,
Journal, Library, course pages, Events, Community, Coaching, Account, Billing,
Affiliate, and coaching account pages. Existing production Playwright smoke for
signed-in tier routes also passed.

A follow-up frontend finish pass added a local mobile first-session rehearsal for
the core beta member path: sign in, Today, daily audio controls, feedback widget,
beta banner dismissal, My Practice, Events, Community, and coaching availability.
The code-level UX fixes below were verified locally after that pass.

Important product-model correction: the newer repo direction appears to be two
public membership levels, `Positives` and `Positives Plus`, with Level 3/Level 4
kept as legacy/internal scaffolding rather than public plans. Evidence:

- `components/marketing/PricingToggle.tsx` says: "Two-tier layout: Positives
  ($37/mo) and Positives Plus ($97/mo)."
- `lib/plans.ts` marks `level_3` and `level_4` as legacy / no longer sold
  publicly.
- `scripts/migrate-l3-l4-to-l2.mjs` says L3/L4 are no longer publicly marketed
  and migrates those members to Level 2 / Positives Plus.

Raw run output and screenshots were saved locally at:

- `/tmp/positives-member-qa-2026-05-27-fast/report.json`
- `/tmp/positives-member-qa-2026-05-27-fast/*.png`

## Access Findings

- Level 1 login works.
- Level 1 can access Today, My Practice, Journal, Library, Face Your Giants,
  My Courses, Account, Billing, Cancel, Affiliate, and personal coaching account.
- Level 1 sees the expected upgrade prompt for Community.
- Level 1 sees the expected coaching upgrade prompt for Coaching Circle access.
- Level 2 login works.
- Level 2 can access Today, My Practice, Journal, Library, Face Your Giants,
  Events, Community, Account, Billing, Cancel, Affiliate, and personal coaching account.
- Level 2 sees the expected coaching upgrade prompt.
- The legacy Level 3 fixture login works, but Level 3 should not be treated as
  part of the current public alpha gate unless Ryan decides to reintroduce it.

## UX / Product Cleanup List

1. Align event/coaching access with the two-level product model. `Done in repo`
   - A published Level 2 event, `Live Q&A with a Certified Positives Coach`, is
     visible to Level 2 but returns a 404 for the legacy Level 3 fixture.
   - There are multiple published events with only `level_2` access rows.
   - Member-facing event access now treats legacy Level 3/Level 4 as including
     Positives Plus event access, while admin filters still show explicit legacy
     access rows.

2. Replace generic 404s for gated member content. `Partially done`
   - When a signed-in member hits an event they cannot access, the app shows the
     generic 404 page.
   - The 404 page also shows both the member nav and public-style header, which
     feels visually inconsistent.
   - Better UX: "This event is not included in your current plan" with a calm
     path back to Events or membership options.
   - Event detail, live event room, and gated library item pages now return
     calm in-app unavailable states with paths back to Events, Library, or
     Account instead of dropping members into the generic 404.

3. Clean up Community seed/test content before invites. `Deferred by request`
   - The Level 2 Community feed currently includes test posts like "what is your
     favorite movie?" and "Test".
   - This makes the member area feel unfinished.

4. Clean up Events seed/test content before invites. `Deferred by request`
   - The Events calendar includes items titled `Test Event` and
     `Test 2 - New Zoom Event`.
   - Those should be replaced, hidden, or clearly marked as internal fixtures
     before alpha testers are invited.

5. Make the alpha/beta welcome banner less dominant after first exposure. `Done`
   - The Level 2 alpha account sees a large "Ryan, you're in the Positives beta"
     banner at the top of Community, Events, and Coaching.
   - It is useful, but it takes over the first viewport. Consider making it
     once-per-member, collapsible, or smaller after dismissal.
   - The banner is now a compact feedback prompt and remains dismissible. On
     mobile, the explanatory copy is shortened so the first content area stays
     visible sooner.

6. Improve the Today page secondary CTA contrast. `Already fixed in current UI`
   - The "Open My Practice" action now uses the shared secondary button styling
     instead of low-contrast white text.

7. Add a clearer message for non-coaches on `/account/coaching/availability`.
   `Done`
   - Non-coach members now see a coach-only explanation and a clear path back
     to Coaching Sessions instead of a silent redirect.

8. Keep the beta feedback launcher available without blocking mobile content.
   `Done`
   - The mobile launcher is now a compact icon bubble with an unread indicator
     instead of a wide pill that competes with the main content.
   - A Playwright first-session test now confirms the launcher opens the
     feedback dialog on mobile.

9. Do not add Level 4 QA unless Executive Coaching is reintroduced as a live
   member tier.
   - Level 4 exists in the data model and admin tooling, but current evidence
     says it is not publicly marketed.

10. Decide whether to remove or keep the legacy Level 3 fixture. `Partially done`
   - If coaching is now sold as separate packages rather than a membership tier,
     the fixture should probably be migrated or renamed so future QA does not
     mistake it for a public plan.
   - Member-facing copy now points to coaching sessions as add-ons instead of
     presenting Coaching Circle / Executive Coaching as public tiers.

11. Keep replacing placeholder content with real Dr. Paul assets.
    - The current content runway passes launch audit, but it is still seeded QA
      content in places. It should be swapped with approved June/July content
      before a wider beta or public launch.

## Highest Priority Fixes

1. Confirm and document the two-level membership model plus separate coaching
   package sales as the current product truth. `Done in member-facing copy`
2. Remove visible test Community and Events content.
   `Deferred by Ryan for now: placeholder content remains in place.`
3. Improve gated event UX instead of showing a generic 404. `Done for event,
   live event, and gated library item pages`
4. Clean up legacy Level 3/Level 4 assumptions in copy, QA fixtures, and docs.
   `Partially done: public/member copy and event access labels updated; fixtures
   and older docs still need a separate cleanup pass.`
5. Re-run the invite rehearsal after real June content replaces placeholders.
   `Deferred until content is ready.`
