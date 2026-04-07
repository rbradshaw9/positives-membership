# Marketing Automation Platform Evaluation
## Positives Membership — April 2026

---

## Context & Requirements

Positives is a tiered membership platform (L1–L4) built for Dr. Paul's coaching community. The platform is on the verge of a founding-member L1 launch. The marketing automation platform must serve **two fundamentally different jobs**:

1. **Transactional** — welcome emails, payment receipts, password resets (needed at launch)
2. **Lifecycle & behavioral** — onboarding sequences, upgrade nurture, L4 renewal/downsell, churn prevention (needed within 30–60 days of launch)

**Already in place:** MailWizz + Mailgun for bulk email to the ~900k migrated list. The MA platform choice is separate — it handles CRM, automation, and behavioral triggers, not bulk broadcasting.

---

## What We Need the Platform to Do

### Must-have at launch
- [ ] Welcome email on signup
- [ ] Payment receipt / subscription confirmation
- [ ] Password reset relay (or handled by Supabase directly)
- [ ] Stripe webhook → tag member on subscription events

### Must-have within 60 days
- [ ] L1 onboarding sequence (days 1, 3, 7, 14, 30)
- [ ] Upgrade nurture: L1 → L2 → L3 drip sequence
- [ ] Failed payment dunning sequence
- [ ] Cancellation win-back sequence

### L4-specific (within 90 days)
- [ ] L4 expiry sequence: renewal upsell → L3 downsell → auto-downgrade callback at day 14
- [ ] Sales team task notification when L4 expires (day −14)
- [ ] Admin alert on successful L4 renewal or downgrade execution

### Integration requirements
| System | Required integration |
|--------|---------------------|
| Stripe | Native or Zapier — subscription events, payment status, customer tags |
| Supabase / Next.js | Webhook receiver for MA → app callbacks (tier changes) |
| MailWizz | Either replace bulk sending or coexist (separate lists) |
| Calendly | Breakthrough Session booking → L4 lead tag |

---

## Platforms Evaluated

### 1. ActiveCampaign

**Overview:** Event-driven CRM + email automation. The dominant choice for membership and coaching businesses in this revenue range.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Automation depth | ⭐⭐⭐⭐⭐ | Visual conditional automations, event triggers, goal-based branching |
| Stripe integration | ⭐⭐⭐⭐ | Native via Zapier or direct API; can tag on subscription events |
| Webhook callbacks | ⭐⭐⭐⭐⭐ | Outbound webhooks from automations; easy to call `/api/webhooks/automation` |
| CRM / deal tracking | ⭐⭐⭐⭐ | Built-in CRM with pipelines — useful for L4 sales process |
| Transactional email | ⭐⭐⭐⭐ | Postmark integration (separate cost) or via AC Transactional add-on |
| Ease of use | ⭐⭐⭐⭐ | Steeper than ConvertKit, but well-documented |
| Pricing | ⭐⭐⭐ | ~$49–$149/mo at 1k–10k contacts. Scales reasonably. |
| Membership platform fit | ⭐⭐⭐⭐⭐ | Used extensively by coaching/membership businesses |
| API quality | ⭐⭐⭐⭐⭐ | Full REST API; easy to tag/untag programmatically |

**Pro:** Best combination of automation power + CRM for the L4 sales workflow. The visual automation builder makes it feasible for non-technical team to manage sequences.

**Con:** Pricing jumps significantly at higher contact counts. Transactional email requires Postmark separately or the paid AC Transactional add-on (~$15/mo).

**Best fit for:** Full lifecycle automation + L4 sales pipeline + team usability.

---

### 2. Keap (formerly Infusionsoft)

**Overview:** All-in-one CRM, email automation, and billing. Originally built for small business sales.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Automation depth | ⭐⭐⭐⭐ | Campaign builder is powerful but dated UI |
| Stripe integration | ⭐⭐ | Keap has its own payment processing; Stripe integration requires Zapier and is imperfect |
| Webhook callbacks | ⭐⭐⭐ | Possible but less elegant than AC |
| CRM / deal tracking | ⭐⭐⭐⭐⭐ | Strongest CRM of the group; built for sales pipelines |
| Transactional email | ⭐⭐⭐⭐ | Built-in |
| Ease of use | ⭐⭐ | Steep learning curve; legacy UI; onboarding requires time investment |
| Pricing | ⭐⭐ | $299/mo baseline. Expensive for the feature set you'd actually use. |
| Membership platform fit | ⭐⭐⭐ | Used more for product businesses than membership |
| API quality | ⭐⭐⭐ | Solid but less modern than AC or ConvertKit |

**Pro:** Best pure CRM. If the business were primarily sales-driven with complex pipelines, Keap would be the choice.

**Con:** Stripe integration is a second-class citizen. The billing system overlap creates friction — you'd pay for features you can't use because you've already built billing in Stripe. Expensive. UI feels dated compared to modern tools.

**Verdict: Not recommended.** The Stripe overlap and pricing make it a poor fit for Positives.

---

### 3. Kit (formerly ConvertKit)

**Overview:** Creator-focused email automation. Simple, clean, strong deliverability.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Automation depth | ⭐⭐⭐ | Sequences and automations work well for linear flows; less flexible for complex branching |
| Stripe integration | ⭐⭐⭐ | Via Zapier; no native deep integration |
| Webhook callbacks | ⭐⭐⭐ | Outbound webhooks available; workable |
| CRM / deal tracking | ⭐ | No CRM — subscribers only |
| Transactional email | ⭐⭐ | Not a strength; typically requires a separate transactional provider |
| Ease of use | ⭐⭐⭐⭐⭐ | Simplest of all options |
| Pricing | ⭐⭐⭐⭐⭐ | Free up to 10k subscribers; paid from $29/mo |
| Membership platform fit | ⭐⭐⭐ | Good for content creators; weaker for multi-tier membership + L4 sales |
| API quality | ⭐⭐⭐⭐ | Clean REST API |

**Pro:** Cheapest. Easiest to use. Great deliverability. Fine for simple onboarding sequences.

**Con:** No CRM means no L4 sales pipeline. Complex conditional branching (L4 upsell → downsell logic) is awkward. You'd outgrow it within 6 months as the tiers mature.

**Verdict: Not recommended as primary.** Good as a fallback if budget is the primary constraint and L4 volume is low.

---

### 4. HubSpot Marketing Hub

**Overview:** Enterprise-grade marketing + CRM. Very powerful. Very expensive.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Automation depth | ⭐⭐⭐⭐⭐ | Best-in-class workflows |
| Stripe integration | ⭐⭐⭐⭐⭐ | Native Stripe app in HubSpot marketplace |
| Webhook callbacks | ⭐⭐⭐⭐⭐ | Full workflow action webhooks |
| CRM / deal tracking | ⭐⭐⭐⭐⭐ | Industry-leading |
| Transactional email | ⭐⭐⭐⭐ | Built-in via Marketing Hub |
| Ease of use | ⭐⭐⭐ | Powerful but complex; steep onboarding |
| Pricing | ⭐ | Starter $50/mo. Professional $890/mo. Overkill for this stage. |
| Membership platform fit | ⭐⭐⭐⭐ | Strong but priced for larger organizations |
| API quality | ⭐⭐⭐⭐⭐ | Best API of the group |

**Verdict: Not recommended at this stage.** Professional features are 12–18 months ahead of where Positives needs to be. Revisit when MRR > $50k.

---

### 5. Build Custom (Supabase + MailWizz + Resend/Postmark)

**Overview:** Use existing infrastructure — Supabase for member state, Resend/Postmark for transactional email, MailWizz for lifecycle broadcasts — and build automation triggers via Stripe webhooks and a custom job queue.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Automation depth | ⭐⭐ | Would need to build sequence engine; significant engineering time |
| Stripe integration | ⭐⭐⭐⭐⭐ | Already built into the app |
| Webhook callbacks | ⭐⭐⭐⭐⭐ | Native — we control the app |
| CRM / deal tracking | ⭐ | Would need to build |
| Transactional email | ⭐⭐⭐⭐ | Resend/Postmark integration is straightforward |
| Ease of use | ⭐ | No visual builder — everything is code |
| Pricing | ⭐⭐⭐⭐⭐ | Near-zero — just Resend ($20/mo) or Postmark |
| Membership platform fit | ⭐⭐⭐ | Perfect data integration; poor operational usability |
| API quality | ⭐⭐⭐⭐⭐ | We own it |

**Pro:** Cheapest. No vendor dependency. Perfect Stripe/Supabase integration. Transactional email (welcome, receipt) via Resend could be done in a day.

**Con:** The lifecycle automation engine (onboarding sequences, branching, win-back) would take weeks to build properly and months to maintain. Non-engineers can't manage sequences. No CRM for L4 pipeline. **Building a sequence engine is not a good use of engineering time at this stage.**

**Verdict: Partially recommended.** Build the transactional layer only (Resend + webhook handlers for welcome/receipt/password-reset). Use a proper MA platform for lifecycle automation.

---

## Decision Matrix

| Platform | Automation | Stripe | CRM | Ease | Price | Fit |
|----------|-----------|--------|-----|------|-------|-----|
| **ActiveCampaign** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ **Recommended** |
| Keap | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ❌ |
| Kit | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⚠️ Budget only |
| HubSpot | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⏳ Revisit at scale |
| Custom | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⚠️ Transactional only |

---

## Recommendation

> **ActiveCampaign + Resend (transactional)**

**Phase 1 — At launch (this week):**
- Integrate **Resend** for transactional email (welcome, payment receipt, password reset)
- ~1 day of engineering. Zero ongoing cost until 3k emails/mo.
- No MA platform needed yet.

**Phase 2 — Within 30 days of launch:**
- Onboard **ActiveCampaign** (Plus plan, ~$49/mo at launch contact volume)
- Connect Stripe via Zapier: `customer.subscription.created` → tag `l1_member`
- Build L1 onboarding sequence (7-email, 30-day)
- Build failed payment dunning (3-email, 7-day)

**Phase 3 — Within 60 days:**
- L1 → L2 upgrade nurture sequence
- L4 expiry automation sequence (upsell → downsell → webhook callback)
- L4 sales pipeline in AC CRM (deals for Breakthrough Session prospects)
- Calendly → AC integration for Breakthrough Session bookings

### Why not Keap?
Keap's payment system creates structural friction with Stripe and the pricing doesn't justify the CRM advantage. The team would spend onboarding time fighting the tool rather than shipping sequences.

### Why not build custom?
Engineering time is better spent on product. A bespoke sequence engine would take weeks and require ongoing maintenance. ActiveCampaign's automation builder lets non-engineers manage sequences without code changes.

---

## Implementation Plan (ActiveCampaign)

### Phase 1: Resend transactional (launch gate)

```
1. Add RESEND_API_KEY to Vercel
2. Create /lib/email/send.ts with Resend client
3. Trigger welcome email from Stripe webhook: checkout.session.completed
4. Trigger payment receipt from invoice.payment_succeeded
5. Configure Supabase auth to use custom SMTP via Resend for password reset
```

**Estimated effort:** 4–6 hours

### Phase 2: ActiveCampaign onboarding

```
1. Create AC account (Plus plan)
2. Set AC_API_KEY and AC_API_URL in Vercel
3. Create /lib/activecampaign/client.ts
4. Add contact + apply tag from webhook handlers:
   - checkout.session.completed → tag "l1_member"
   - customer.subscription.deleted → tag "canceled"
   - invoice.payment_failed → tag "payment_failed"
5. Build L1 onboarding automation in AC UI
6. Connect Calendly → AC for Breakthrough Session leads
```

**Estimated effort:** 1–2 days engineering + content writing for emails

### Phase 3: L4 automation callback endpoint

```
1. Create /api/webhooks/automation/route.ts
2. Accept signed POST from AC with action: "downgrade_to_l3"
3. Validate signature, update member tier in Supabase, fire Stripe subscription update
4. Notify admin Slack/email of the downgrade
```

**Estimated effort:** 3–4 hours

---

## Next Steps

- [ ] Approve this recommendation
- [ ] Sign up for Resend (free tier, no credit card needed for 3k/mo)
- [ ] Sign up for ActiveCampaign (Plus plan — 14-day free trial available)
- [ ] Engineering: implement Phase 1 Resend integration
- [ ] Content: write L1 welcome email and 7-email onboarding sequence copy
