# Session Resume — Positives Membership

> Last updated: 2026-04-09 · after affiliate portal reset work on `main`

---

## What shipped this session

### Affiliate portal reset
**Files:** `components/affiliate/AffiliatePortal.tsx`, `app/(member)/account/affiliate/page.tsx`, `app/account/affiliate/actions.ts`, `lib/affiliate/destinations.ts`, `lib/affiliate/portal.ts`

- **Payout gating** — affiliates must save a PayPal payout email before the in-app affiliate portal opens
- **PayPal-first onboarding** — the payout setup screen is now mandatory, with supportive copy for members who still need to create a PayPal account
- **Internal-only tracked links** — new tracked links are generated for approved Positives destinations only:
  - homepage
  - join
  - about
  - faq
  - support
- **Link format** — generated tracked links stay in the canonical FirstPromoter path:
  - `https://positives.life/<path>?fpr=<token>&sub_id=<source>`
- **Legacy redirects** — old `/go/[code]` links still work, but are now treated as legacy convenience links rather than the canonical tracking system
- **Performance truth** — the Performance tab stays FirstPromoter-only
- **W-9 removed from product flow** — no active W-9 UI, page query, or runtime dependency remains in the affiliate experience

---

## Current affiliate product rules

- **FirstPromoter** is the source of truth for affiliate attribution and reporting
- **PayPal** is required before affiliate portal access
- **W-9 is not collected in-app**
- **New custom tracked links are internal-only**
- **External destination redirects are no longer the recommended tracked-link model**

---

## Known next steps / things to verify

| Item | Status | Notes |
|---|---|---|
| Affiliate payout gate live check | ⬜ Pending | Verify an enrolled affiliate without `paypal_email` is forced into payout setup on production |
| Internal tracked link smoke test | ⬜ Pending | Generate a join/about/faq/support link with `sub_id`, copy it, open it, and confirm FP attribution still behaves correctly |
| Legacy redirect compatibility | ⬜ Pending | Confirm older `/go/[code]` links still resolve as expected |
| Affiliate mobile pass | ⬜ Pending | Verify the payout setup screen and My Link builder feel clean on phone widths |

---

## Key file map

```
app/(member)/account/affiliate/
  page.tsx                     # Fetches FirstPromoter data + legacy redirect rows; no active W-9 query

app/account/affiliate/
  actions.ts                   # Enroll affiliate, save PayPal email, generate internal tracked links, update slug
  portal/route.ts              # Blocks external FP dashboard access until payout email is saved

components/affiliate/
  AffiliatePortal.tsx          # Payout-gated portal UI, slug customizer, internal tracked link builder, earnings/history

lib/affiliate/
  destinations.ts              # Approved internal affiliate destinations + URL builder
  links.ts                     # Legacy redirect helper for /go and /c compatibility
  portal.ts                    # FirstPromoter-only performance view model

supabase/migrations/
  20260408190000_create_member_w9.sql   # Dormant legacy table, no longer part of the active affiliate product flow
```
