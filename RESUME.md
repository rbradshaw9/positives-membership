# Session Resume — Positives Membership

> Last updated: 2026-04-09  
> Baseline: current workspace, not just pushed `main`

---

## Where We Are

This project now has a fresh reality-sync model:

- `Current workspace truth` = what exists locally right now
- `Live now` = what has actually been deployed or verified in production
- `Decided next` = product direction agreed in discussion but not built yet

The most important current fact:

- the workspace contains **real in-progress affiliate/legal changes**
- those changes are **not finished yet**
- the repo is **not currently green**

---

## Current Workspace Reality

### Stable truths

- Positives runs on `https://positives.life`
- FirstPromoter is the affiliate attribution/reporting source of truth
- the member affiliate portal exists in Positives
- PayPal payout setup is required before full affiliate portal access
- W-9 is out of the active affiliate product flow
- GA4 phase-1 instrumentation exists in the repo

### In-progress affiliate/legal work

Local uncommitted changes currently do all of the following:

- simplify `My Links`
- remove the heavy explanatory tracked-link/legacy-link sections
- rework `Share Kit` into a clearer “pick a link, optionally add a source tag, then copy the message” flow
- remove the account-page `?auto_enroll=1` shortcut
- add an affiliate-terms agreement checkbox to enrollment
- make `getReferralLinkAction()` require explicit agreement
- add links to a planned `/affiliate-program` public rules page

### Current blocker state

The workspace is not yet coherent:

- `npm run lint` fails
  - unused `useRef`
  - `react-hooks/set-state-in-effect` in `ShareTab`
- `npm run build` fails
  - `app/(member)/account/affiliate/page.tsx` still passes `autoEnroll`
  - `AffiliatePortal` no longer accepts that prop

That means the current local affiliate/legal work is **partially implemented**, not ready to ship.

---

## Live / Shipped Reality

- live affiliate onboarding is still effectively member-first
- the live affiliate portal exists at `/account/affiliate`
- FirstPromoter is the live tracking contract
- canonical affiliate parameter is `?fpr=`
- the public affiliate program rules page does **not** exist yet
- required affiliate terms agreement is **not** safe to assume live yet

---

## Decisions We Have Made

### Locked decisions

- add a public-facing affiliate rules page
- require explicit agreement before affiliate account creation
- keep FirstPromoter as the attribution/payout engine
- keep Positives as the preferred affiliate-facing experience

### Direction we are leaning toward

- support public-facing, non-member affiliates in the future
- likely keep that experience in Positives rather than splitting assets/resources between Positives and a separate FirstPromoter-only surface
- use email as the first reconciliation key when someone later becomes both:
  - a partner/affiliate
  - a Positives member

### Important distinction

This future partner architecture is **not implemented yet** and should stay in the `decided next` bucket until we build it.

---

## Next Batches

### 1. Finish the current affiliate/legal workspace batch

- create the public `/affiliate-program` page
- complete the explicit agreement flow
- remove the leftover `autoEnroll` mismatch
- make the workspace green again

### 2. Finish Share Kit and affiliate usability cleanup

- tighten the `Share Kit` layout and interactions
- ensure `My Links` feels simple and direct
- verify mobile and desktop usability

### 3. Design the public partner architecture

- decide how non-member affiliates sign up
- define what lives in Positives vs FirstPromoter
- define the partner/member linking model by email

### 4. Implement partner identity rules

- reconcile affiliate partner records, member records, and FP promoters
- prevent duplicate promoter/member confusion
- document lifecycle rules clearly

### 5. Resume broader launch cleanup

- continue from the refreshed audit backlog once affiliate architecture is stable

---

## Files That Matter Most Right Now

- [components/affiliate/AffiliatePortal.tsx](/Users/ryanbradshaw/AntiGravity/positives-membership/components/affiliate/AffiliatePortal.tsx)
- [app/account/affiliate/actions.ts](/Users/ryanbradshaw/AntiGravity/positives-membership/app/account/affiliate/actions.ts)
- [app/(member)/account/affiliate/page.tsx](/Users/ryanbradshaw/AntiGravity/positives-membership/app/(member)/account/affiliate/page.tsx)
- [components/affiliate/AffiliateCTA.tsx](/Users/ryanbradshaw/AntiGravity/positives-membership/components/affiliate/AffiliateCTA.tsx)
- [CURRENT_IMPLEMENTATION_TRUTH.md](/Users/ryanbradshaw/AntiGravity/positives-membership/CURRENT_IMPLEMENTATION_TRUTH.md)
- [AUDIT_2026-04-09.md](/Users/ryanbradshaw/AntiGravity/positives-membership/AUDIT_2026-04-09.md)

---

## Mental Model Going Forward

When resuming work, do not ask “what is true?” globally. Ask:

- what is true in the current workspace?
- what is live right now?
- what is merely decided next?

That distinction is now the backbone of the project handoff and should prevent future drift.
