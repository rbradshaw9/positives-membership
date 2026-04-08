# Resume — Positives Membership Platform

**Last updated:** 2026-04-07 @ ~9pm ET  
**Branch:** `main` — all work committed and pushed  
**Dev server:** `PORT=3015 npm run dev`  
**Production:** https://positives.life

---

## ✅ What Was Completed Tonight

### Affiliate Short Link System (100% done)
- **`/go/[code]`** — Route Handler (`route.ts`) using `NextResponse.redirect()`. Looks up code in `affiliate_link` table, increments click counter, redirects to `/c/[code]` for external URLs or directly with `?via=TOKEN` for internal.
- **`/c/[code]`** — Server component fetches destination from DB, passes to `CookieSetter` client component which waits 1.2s for Rewardful cookie, then redirects via `window.location.href`.
- **`affiliate_link` DB table** — `id, member_id, code (UNIQUE), label, destination, token, clicks, created_at`
- **Link Builder UI** — In the "My Link" tab of the Affiliate Portal. Create (name + URL), Copy, Edit destination (✏️ inline), Delete.
- **URL generation** — Code is now `label-slug` only (e.g. `positives.life/go/my-blog`), no token prefix.
- **URL validation** — Server-side: normalizes bare domains, rejects non-http/https, localhost, private IPs.
- **Server actions** — `createAffiliateLinkAction`, `updateAffiliateLinkAction`, `deleteAffiliateLinkAction`
- **Verified working** — Redirect tested live: `/go/ryan-level-3-test-test-link` → Google ✅

---

## 🔴 Next Priority — ActiveCampaign Lifecycle Automations

This is the **#1 blocking item** for launch. Members aren't getting:
- Onboarding drip after signup
- Affiliate welcome after enrollment
- Past-due recovery emails (tokens are implemented, AC automation is not)
- Canceled win-back sequence

### Context
- Billing recovery signing tokens: **implemented** in `server/services/stripe/handle-subscription.ts` and `app/api/billing-portal/route.ts`
- AC sync: `lib/activecampaign/sync.ts` — fires on subscription events
- Past due hook: sends `status=past_due` to AC. The automation needs to send the 1-click billing link.
- Playbook for all automations: was written in a prior session — check the conversation logs for `9f01dc9a` (Finalizing Positives Membership Automation)

### Automations to build in AC
1. **Member Onboarding** (trigger: added to list → tag `member-active`)  
   - Day 0: Welcome + what to expect  
   - Day 2: Your first 10-minute practice  
   - Day 7: Check-in + quick win  

2. **Affiliate Welcome** (trigger: tag `affiliate-enrolled`)  
   - Day 0: Your link + link builder intro  
   - Day 3: Swipe copy + share tips  

3. **Past Due Recovery** (trigger: tag `billing-past-due`)  
   - Immediately: "Update your payment" with 1-click billing portal link  
   - Day 3: Second attempt  
   - Day 7: Final warning  
   - Day 10: Cancel + win-back sequence begins  

4. **Canceled Win-Back** (trigger: tag `member-canceled`)  
   - Day 0: "We're sorry to see you go" + soft re-engagement  
   - Day 14: Value reminder  
   - Day 30: Special offer  

---

## 🟡 Also Needed Before Launch

### `support@positives.life` Mailbox
- Needed as reply-to on all transactional emails
- Options: Cloudflare Email Routing → forward to Gmail, or Zoho Mail free tier
- Currently emails go out with a no-reply setup — bounces have no support path

### Verify Rewardful Cookie Flow End-to-End
- Test that visiting `positives.life/go/[code]` (external) → `/c/[code]` → destination actually sets the `via` cookie that Rewardful sees at checkout
- Check Rewardful dashboard after a test conversion to confirm attribution

---

## 🟢 Deferred / Post-Launch

| Item | Notes |
|---|---|
| VIP affiliate tier | Second Rewardful campaign at 30% for top performers |
| Affiliate sub-ID tracking | `?sid=` on links for ad/email channel breakdowns |
| Google Drive ingestion | Content pipeline |
| Castos automation | Podcast episode sync |
| AI embeddings | Schema exists, not populated |
| Role-based admin auth | After L1 launch |

---

## Key Files

| File | Purpose |
|---|---|
| `app/go/[code]/route.ts` | Affiliate redirect Route Handler |
| `app/c/[code]/page.tsx` | Cookie-setter server component |
| `app/c/[code]/CookieSetter.tsx` | Client redirect after Rewardful fires |
| `components/affiliate/AffiliatePortal.tsx` | Full affiliate portal UI |
| `app/account/affiliate/actions.ts` | All affiliate server actions |
| `app/(member)/account/affiliate/page.tsx` | Page that fetches + renders portal |
| `proxy.ts` | Auth middleware (this version of Next.js uses proxy.ts, NOT middleware.ts) |
| `lib/activecampaign/sync.ts` | AC contact sync on lifecycle events |
| `server/services/stripe/handle-subscription.ts` | Stripe webhook → billing state |
| `CURRENT_IMPLEMENTATION_TRUTH.md` | Full system source of truth |

---

## Quick Commands

```bash
# Dev server
PORT=3015 npm run dev

# Type check
npx tsc --noEmit

# Push
git add -A && git commit -m "..." && git push
```

## Important: Next.js Version Note
This project uses **Next.js 16+** which has breaking changes:
- Middleware is **`proxy.ts`** (not `middleware.ts`)
- Always use **Route Handlers** (`route.ts`) for redirect-only endpoints, not Server Components with `redirect()`
- Read `node_modules/next/dist/docs/` before using unfamiliar APIs
