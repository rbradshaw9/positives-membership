# Beta Launch Gate

*Locked scope for the first Positives beta cohort. Update only with an explicit decision.*

**Last updated:** 2026-05-19

---

## Beta promise (what we tell testers)

Members can:

1. Subscribe at **Level 1** and land on **Today** with real daily practice audio
2. Use **Practice** and the **Library** (including courses included with membership)
3. **Journal** and save notes
4. Manage **Account** and **billing** self-service
5. Report issues via **Share beta feedback** (syncs to Asana)

We do **not** promise for beta: community, live events, coaching booking, affiliate payouts, L2–L4 tiers, automated email nurture, or a completion-based “starter course.”

---

## Environment flags (production)

| Variable | Beta value |
|----------|------------|
| `ENABLE_COMMUNITY_PREVIEW` | `false` |
| `ENABLE_BETA_FEEDBACK` | `true` |
| `ENABLE_BETA_WELCOME` | `true` |

---

## Code gate checklist

Run before inviting each cohort:

```bash
npm run lint
npm run build
npm run audit:launch
npm run audit:security
npm run ops:beta-check
npm run audit:email
npm run audit:env
npm run test:e2e   # requires local Supabase + Stripe test env
```

Manual smoke (15 min):

- [ ] `/join` → Stripe test checkout → `/subscribe/success` → `/today`
- [ ] Daily audio plays; mark listened works
- [ ] `/library` shows courses + monthly archive (L1 member)
- [ ] Open **Face Your Giants** (or another included course) → lesson plays
- [ ] `/journal` new entry
- [ ] `/account` → billing portal
- [ ] Beta feedback submits and appears in Asana **Positives - Beta Feedback**

---

## Content gate (ops — not code)

- [ ] Real daily audio scheduled for beta date range (no empty Today days)
- [ ] No published SoundHelix/scaffold/placeholder content in the rolling 8-week invite window
- [ ] At least one weekly principle + monthly theme for current month
- [ ] Included courses published with lessons that have `video_url` set

---

## External setup gate (manual)

| System | Minimum for beta |
|--------|------------------|
| Stripe | L1 monthly + annual live; webhook to prod |
| Supabase | Migrations applied; auth URLs for positives.life |
| Postmark | Welcome + password reset + receipt sending |
| Sentry | Prod DSN active |
| FirstPromoter | Optional for beta (affiliate not required) |
| ActiveCampaign | **Defer** full lifecycle; transactional via Postmark is enough |
| PayPal / affiliate payouts | **Defer** |

---

## Asana projects

| Project | Role |
|---------|------|
| [Positives Finish Roadmap](https://app.asana.com/1/1121814557377551/project/1214005103885510) | Engineering + launch tasks |
| [Positives - Beta Feedback](https://app.asana.com/1/1121814557377551/project/1214514517978998) | Tester-reported issues |
| Positives Membership | Archived — do not use |

**P0 sections** on Finish Roadmap: Launch-Critical Build + QA, Beta Launch Readiness, Manual Setup / External Dependencies.

**Defer** to Post-Launch: Launch Decisions Pending Ryan / Dr. Paul (unless blocking a beta tester).

---

## Known beta fixes (2026-05-19)

| Issue | Status |
|-------|--------|
| Face Your Giants lessons 404 (prod missing `course_lesson.slug` / `status`) | Fixed in `getCourseLesson` legacy fallback |
| Beta welcome “What to try” unclear on Today | Copy updated in `BetaWelcomeBanner` |
| Production DB behind latest migrations (`access_type`, lesson `slug`) | Apply `supabase/migrations` when ready; app fallbacks until then |

---

## Definition of done

Beta launch is **ready to invite** when:

1. All **Code gate** items pass
2. **Content gate** signed off by Ryan / content owner
3. **External setup** rows marked minimum complete
4. No open **P0** tasks in Beta Feedback inbox
5. Cohort size ≤ 15 for first wave

---

## Post-beta (explicitly not in scope)

- Gamification / streak flames
- Next.js blog
- Community launch
- Events + ticketing
- Native coaching scheduler at scale
- Google Drive → S3 ingestion automation
- Full ActiveCampaign phase 2
