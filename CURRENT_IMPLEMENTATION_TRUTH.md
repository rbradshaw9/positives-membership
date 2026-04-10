# CURRENT_IMPLEMENTATION_TRUTH.md

*Reality-sync baseline for Positives.*  
*Last verified: 2026-04-09 against the current workspace, linked Supabase project, and current docs.*

---

## State Model

This document now uses three explicit truth states:

- **Current workspace truth** — what exists in the local repo right now, including uncommitted changes
- **Production/live truth** — what has been confirmed as live or previously deployed
- **Decided next** — product direction agreed in discussion but not yet fully implemented

Do not treat `decided next` items as shipped behavior.

---

## Current Workspace Truth

### Core platform

- Canonical public domain is `https://positives.life`
- Stripe remains the billing source of truth
- FirstPromoter remains the affiliate attribution and reporting source of truth
- GA4 phase-1 instrumentation exists in the repo
- Public support address is `support@positives.life`

### Membership and pricing

- Level 1 pricing truth is `$37/mo` and `$370/yr`
- Level 2 pricing truth is `$97/mo` and `$970/yr`
- Level 3 pricing truth is `$297/mo` and `$2,970/yr`
- Level 4 is admin-assigned and priced separately
- The product supports member auth, billing portal access, content delivery, journaling, practice tracking, and admin content/member tools

### Affiliate program in the workspace

- The affiliate program is still fundamentally **member-first**
- Authenticated members can enroll as affiliates and get a FirstPromoter promoter record
- The in-app affiliate portal remains the Positives-facing experience for member affiliates
- PayPal payout setup is required before full affiliate portal access
- W-9 is no longer part of the active member affiliate flow
- The affiliate portal tabs are:
  - `My Links`
  - `Performance`
  - `Share Kit`
  - `Earnings`

### Affiliate workspace changes currently in progress

The local workspace includes unfinished affiliate/legal changes that are **not yet a completed truth state**:

- `components/affiliate/AffiliatePortal.tsx` now:
  - simplifies `My Links`
  - removes the old legacy redirect management UI from the main portal experience
  - refocuses `Share Kit` around choosing a tracked link, optionally adding a `sub_id`, and copying share-ready messaging
  - adds links to a planned `/affiliate-program` page
  - adds an agreement checkbox on affiliate enrollment
- `components/affiliate/AffiliateCTA.tsx` now:
  - removes the old `?auto_enroll=1` shortcut
  - links to the planned affiliate terms page
- `app/account/affiliate/actions.ts` now:
  - requires `agreedToTerms: boolean` before `getReferralLinkAction()` will create the affiliate account
- `app/(member)/account/affiliate/page.tsx` still passes `autoEnroll`, so the workspace is currently inconsistent

### Current workspace validation state

The current workspace is **not green**:

- `npm run lint` fails
  - unused `useRef` import in `components/affiliate/AffiliatePortal.tsx`
  - `react-hooks/set-state-in-effect` error in `ShareTab`
- `npm run build` fails
  - `app/(member)/account/affiliate/page.tsx` still passes `autoEnroll` to `AffiliatePortal`, but that prop was removed from the component

That means the agreement-flow and share-kit refinements are correctly classified as **in-progress workspace changes**, not finished implementation truth.

---

## Production / Live Truth

### Platform

- Live domain is `https://positives.life`
- Vercel production has been verified previously in this audit cycle
- Stripe webhooks, Supabase auth, and billing portal are part of the current live stack
- FirstPromoter is the canonical live affiliate platform

### Affiliate program live truth

- Live affiliate onboarding is still tied to the authenticated member flow
- The live member affiliate portal exists inside Positives at `/account/affiliate`
- Live affiliate tracking contract is `?fpr=`
- FirstPromoter remains the source of truth for attribution, clicks, leads, members, and commissions
- PayPal payout gating is part of the active affiliate product direction and should be treated as current repo truth, but any uncommitted portal/legal refinements should not be assumed live until shipped

### What is not yet safe to call live

Do **not** treat these as live without a fresh deploy/verification pass:

- required affiliate terms agreement at enrollment
- public `/affiliate-program` page
- the newer simplified `My Links` / `Share Kit` workspace refinements
- removal of the last `auto_enroll` dependency in the member affiliate page

---

## Decided Next

These decisions have been made in discussion and should guide the next implementation batches:

### Affiliate rules and agreement

- Add a public affiliate rules page, likely `/affiliate-program`
- Require explicit agreement to affiliate program terms before creating an affiliate account
- Link the rules page from:
  - the member affiliate CTA
  - the enrollment screen
  - payout/earnings surfaces

### Affiliate information architecture

- Keep FirstPromoter as the tracking and commission engine
- Keep the Positives portal as the main affiliate-facing experience
- Make `My Links` simpler and more direct
- Make `Share Kit` easier to use and centered on one selected share link plus optional `sub_id`

### Future partner direction

The team is currently leaning toward:

- a **Positives-hosted partner experience**
- FirstPromoter underneath for attribution/payouts
- support for non-member affiliates/partners in the future
- email-based reconciliation between:
  - a future partner account
  - a Positives member account
  - the FirstPromoter promoter record

This has **not** been built yet and should remain clearly labeled as next-state architecture.

---

## Critical Contracts To Keep Straight

### True now

- `member.fp_promoter_id` and `member.fp_ref_id` are the active cached affiliate identifiers in Positives
- `member.referred_by_fpr` is the persisted genealogy/referrer field captured from checkout
- `member.paypal_email` is the current in-app payout coordination field
- FirstPromoter is the reporting source of truth

### In-progress workspace contracts

- `getReferralLinkAction(agreedToTerms)` is the intended new contract in the workspace
- the enrollment UI now expects a public `/affiliate-program` route to exist

### Decided next contracts

- partner identity should eventually be distinct from member identity
- email should be the first reconciliation key between future partner and member accounts
- affiliate rules should live in a dedicated public surface rather than being buried in general site terms

---

## Forward Path

Recommended implementation order from this reality-sync point:

1. Finish the in-progress affiliate/legal workspace changes so the repo is green again
2. Add the public affiliate rules page and complete the required agreement flow
3. Finalize the simplified `My Links` and `Share Kit` experience
4. Design the public-facing partner / non-member affiliate architecture
5. Define identity-linking rules between partner records, member records, and FirstPromoter promoters
6. Resume broader launch cleanup from the audit backlog

---

## Notes

- This document is intentionally the current operating truth, not the historical migration story
- Historical Rewardful/FirstPromoter migration docs should be treated as archived context, not current architecture
- This is not legal advice; affiliate rules/terms should still receive legal review if you want stronger protection
