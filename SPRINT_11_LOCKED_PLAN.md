# SPRINT_11_LOCKED_PLAN
# Sprint 11: Member Visual Cohesion — Decision-Locked Implementation Record

**Status: LOCKED. Do not modify without explicit sprint plan update.**

---

## 1. Final Sprint 11 Decision

### Sprint Name
**Sprint 11: Member Visual Cohesion**

### Primary Objective
Make the Positives member area feel like the same product as the marketing site. Close the visual gap between the marketing frontend and the member experience by reusing established design motifs — not by inventing new ones.

### What Success Looks Like
- A member navigating from the marketing homepage to `/today`, `/account`, `/journal`, or `/coaching` experiences seamless tonal and visual continuity
- The account page has clear visual hierarchy — membership status reads as the most important item, not identical to a timezone picker
- The journal page feels personal and calm, not like a database list view
- Writing a note (NoteSheet) feels like using a focused writing tool, not a system dialog
- Every primary button in the member area uses the same gradient/pill treatment as the marketing site CTA buttons
- Hero section backgrounds on member pages match the Today page's radial-gradient pattern — a single unified approach across `/today`, `/account`, `/journal`, `/coaching`, `/library`
- The navigation has a visible, unambiguous active state on both desktop and mobile
- Mobile members see the Positives wordmark

### What Is Explicitly Out of Scope for Sprint 11
- No schema changes of any kind
- No new database migrations
- No new pages or routes
- No new product features (search improvements, new content types, etc.)
- No onboarding, community, events, email, or AI work
- No changes to DailyPracticeCard, WeeklyPrincipleCard, or MonthlyThemeCard — these are already polished
- No changes to admin pages
- No changes to marketing pages
- No changes to auth pages
- No new npm dependencies

---

## 2. Design Reuse Rules

These rules govern how design language from `landing-client.tsx` and the existing brand tokens transfers to member pages. They are binding for this sprint.

### Gradients

**ALLOWED — Carry over directly:**
- Hero section background: `radial-gradient(ellipse at 60% 0%, rgba(47,111,237,0.07) 0%, transparent 65%), var(--color-card)`
  - This is the Today page pattern. It must be the standard for all member page hero sections.
- Primary button fill: `linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)`
  - This is the marketing CTA button gradient. It is the only gradient allowed on buttons.
- Subtle content area tint: `linear-gradient(to bottom, color-mix(in srgb, var(--color-secondary) 6%, transparent), transparent)`
  - Already used in WeeklyPrincipleCard. Do not introduce new gradient tints.

**NOT ALLOWED:**
- No hero background gradients using green or amber as the primary tint
- No blue-to-green text gradient (`background-clip: text`) — marketing only, too loud for member flows
- No new gradient combinations invented for individual pages

### Card Elevation / Borders / Shadows

- Standard member card: `var(--shadow-medium)` — `0 12px 36px rgba(18,20,23,0.08)`. NOT `shadow-soft`. `shadow-soft` is almost invisible on the warm background. This changes for all member area cards.
- Elevated card (membership status, upcoming coaching call): `var(--shadow-large)` — `0 18px 60px rgba(18,20,23,0.12)`. Use sparingly — one per page maximum.
- Content-type left accent border — the only color variation allowed on cards:
  - Daily content → `border-l-[3px] border-l-primary`
  - Weekly content → `border-l-[3px] border-l-secondary`
  - Monthly content → `border-l-[3px] border-l-accent`
  - Free-form / coaching / untyped → no left border
- Card border radius: `rounded-2xl` everywhere. Do not mix `rounded-xl` and `rounded-2xl` on adjacent cards.
- No new border color or style variations. Use `var(--color-border)` only.

### Spacing Rhythm

- Hero sections: `py-10 md:py-14` inside `.member-hero`
- Page content gap: `gap-5` between cards, `gap-8` between sections
- Card internal padding: `p-5 md:p-6` (compact), `p-6 md:p-8` (primary/hero cards)
- All existing spacing decisions that already work must be preserved

### Typography Hierarchy

Four levels — do not add a fifth:
1. **Page heading:** `font-heading font-bold text-3xl md:text-4xl tracking-[-0.035em]` — via PageHeader component
2. **Card heading:** `font-heading font-bold text-xl tracking-[-0.02em]` — existing card titles
3. **Section eyebrow:** `text-xs font-semibold uppercase tracking-widest text-muted-foreground` — via SectionLabel component
4. **Body/meta:** `text-sm text-muted-foreground leading-body`

No inline type sizing that doesn't match one of these four levels.

### Accent Colors

Three accent colors exist. Each maps to one content type. Do not use them interchangeably.

| Color | Token | Meaning | Allowed on |
|---|---|---|---|
| `#2F6FED` | `--color-primary` | Daily / primary action | Active nav, primary buttons, daily content borders, focus rings |
| `#4E8C78` | `--color-secondary` | Weekly / active status | Membership status indicator, weekly content borders, success states, streak |
| `#D98A4E` | `--color-accent` | Monthly / warm highlight | Monthly content borders, monthly TypeBadge |

**What is NOT allowed:**
- No ad hoc use of these colors outside their semantic role
- No new colors invented for Sprint 11
- No mixing primary and secondary on the same element
- No using accent for buttons, headings, or backgrounds

### Hero Sections

- Every member page must have a hero section
- All hero sections use the `.member-hero` CSS class — identical treatment everywhere
- Hero content sits inside `.member-container` at `py-10 md:py-14`
- The `PageHeader` component with `hero={true}` is the delivery mechanism on Account, Journal, Library, Coaching
- Today page keeps its existing custom hero (matches the pattern, already done)

### Buttons

**All primary actions use `.btn-primary`:**
- Pill shape: `border-radius: var(--radius-pill)`
- Gradient fill: `linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)`
- Glow shadow: `0 4px 14px rgba(47,111,237,0.22)`
- Font: `font-weight: 600; font-size: 0.875rem; letter-spacing: -0.01em`
- Color: `#FFFFFF`
- Hover: `opacity: 0.92`
- Active: `transform: scale(0.98)`
- Disabled: `opacity: 0.4; cursor: not-allowed`

**Secondary/ghost actions:**
- `border border-border bg-transparent text-muted-foreground rounded-full hover:bg-muted`
- Used for: Cancel (NoteSheet), Dismiss (nudge banner)

**Tertiary text links remain as text links:**
- `text-primary hover:text-primary-hover` — used for inline actions like "Read more", "Older →"

**NOT allowed:**
- No more `bg-primary` flat rectangles as buttons
- No more inline `style={{ background: 'linear-gradient(...)' }}` on button elements
- No more text links serving as primary actions (e.g., "Billing →")

### Form Fields

**All member-facing form inputs use `.member-input`:**
- `padding: 0.7rem 1rem`
- `border-radius: var(--radius)` (1.25rem)
- `border: 1.5px solid var(--color-border)`
- `background: var(--color-card)`
- Focus: `border-color: color-mix(in srgb, var(--color-primary) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent)`

No more inline `onFocus`/`onBlur` JS handlers for focus state — CSS only.

Admin inputs keep `.admin-input`. Member inputs use `.member-input`. These are separate classes.

### Background Treatment

- Page background: `var(--color-background)` = `#F6F3EE` — unchanged everywhere
- Hero sections: `.member-hero` (card + radial blue tint) — provides the only meaningful background variation
- Cards: `var(--color-card)` = `#FFFFFF` — unchanged
- Textarea/writing surface: `var(--color-surface-tint)` = `#F1EEE8` — warm paper feel, NoteSheet only
- No new background values. No page-specific background colors.

### What Must NOT Happen

- No ad hoc random accent colors
- No one-off page-specific visual systems
- No loud marketing-style overdesign inside member flows
- No breaking the calm wellness tone
- No shadow values invented outside the three shadow tokens
- No new Tailwind variants outside what already exists

---

## 3. Systematic Styling Contract

### Three New CSS Classes — Add to `app/globals.css`

Add in a new `/* ─── Member UI Utilities ─── */` section.

#### `.member-hero`
```css
.member-hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
  background: radial-gradient(
    ellipse at 60% 0%,
    rgba(47, 111, 237, 0.07) 0%,
    transparent 65%
  ), var(--color-card);
}
```

#### `.btn-primary`
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-pill);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #ffffff;
  background: linear-gradient(135deg, #2f6fed 0%, #245dd0 100%);
  box-shadow: 0 4px 14px rgba(47, 111, 237, 0.22);
  transition: opacity 150ms ease, transform 150ms ease;
  cursor: pointer;
  border: none;
}
.btn-primary:hover { opacity: 0.92; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
```

#### `.member-input`
```css
.member-input {
  width: 100%;
  padding: 0.7rem 1rem;
  border-radius: var(--radius);
  border: 1.5px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-foreground);
  font-size: 0.875rem;
  line-height: 1.5;
  letter-spacing: var(--letter-spacing-body);
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.member-input::placeholder { color: var(--color-muted-fg); }
.member-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
}
```

### `PageHeader` — hero prop extension

Add `hero?: boolean` (defaults to false).

When `hero={true}`: wrap output in `<section className="member-hero">`, use `py-10 md:py-14` inner padding.
When `hero={false}`: behavior identical to current implementation. Fully backward-compatible.

### `EmptyState` — visual weight increase

- Wrap in `bg-card/60 rounded-2xl border border-border/50 p-8 md:p-12 mx-auto max-w-sm`
- Icon container: increase to `w-14 h-14 rounded-full bg-muted/80`
- Title: `text-base font-semibold text-foreground`

### Where Reuse Must Happen

| Class / Component | Required in |
|---|---|
| `.member-hero` | All member page hero sections via `PageHeader hero={true}` |
| `.btn-primary` | NewJournalEntryButton, password SubmitButton, timezone save button |
| `.member-input` | password inputs in account-client.tsx, timezone select in timezone-form.tsx |
| `PageHeader hero={true}` | `/account`, `/journal`, `/library`, `/coaching` |
| `shadow-medium` | All member section cards (replacing `shadow-soft`) |

### Where Page-Specific Styling Is Allowed

Controlled exceptions only:
- NoteSheet textarea: `bg-surface-tint` + inset shadow — NoteSheet only
- Membership card: `shadow-large` + `border-l-secondary` — account page only
- Content-type left borders: keyed to content_type — journal note cards only

### Avoid Replacing Architecture With Styling Hacks

- Never add `style={{}}` blocks for effects achievable with CSS classes
- Never duplicate layout structure to achieve a visual effect
- Never add motion/animation beyond existing `transition-colors` / `transition-opacity` patterns
- Do not add new Tailwind variants — add to `globals.css` instead

---

## 4. Page-by-Page Scope

### Account Page

**Exact scope:**
- `page.tsx`: `<PageHeader title="Account" hero />`. Membership card: `shadow-large`, `border-l-[3px] border-l-secondary`. Replace "Active" badge with `w-2 h-2 rounded-full bg-secondary inline-block`. All other section cards: `shadow-medium`.
- `account-client.tsx`: Remove `onFocus`/`onBlur` handlers from both password inputs. Apply `className="member-input"`. Remove `style={{}}` from `SubmitButton`. Apply `className="btn-primary w-full"` to SubmitButton `<button>`.
- `billing-button.tsx`: `shadow-medium`. Add `hover:bg-muted/30`. Add right-arrow SVG next to "Billing →".
- `timezone-form.tsx`: Apply `className="member-input"` to select. Save button → `<button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>`.

**Unchanged:** data fetching, server actions, form structure, PLAN_NAMES, section ordering.

---

### Journal Page

**Exact scope:**
- `journal/page.tsx`: Remove manual flex wrapper. Use `<PageHeader title="Your Notes" subtitle="Reflections from your practice, in your own words." hero right={<NewJournalEntryButton />} />`. Pass `action={<NewJournalEntryButton />}` to EmptyState.
- `NewJournalEntryButton.tsx`: Remove inline style. Apply `className="btn-primary"`.
- `JournalList.tsx`: Note cards: `shadow-medium`. Add left border by `note.content_type`:
  - `daily_audio` → `border-l-[3px] border-l-primary`
  - `weekly_principle` → `border-l-[3px] border-l-secondary`
  - `monthly_theme` → `border-l-[3px] border-l-accent`
  - other/null → no extra border
  - Month dividers: `text-[10px]` → `text-xs`. `text-muted-foreground/60` → `text-muted-foreground`.

**Unchanged:** getMemberNotes query, grouping logic, NoteSheet open/close, local edit state, router.refresh.

---

### NoteSheet

**Exact scope:**
- Header row: Replace uppercase `<p>` with icon + `<p className="text-sm font-medium text-foreground truncate">`. Add `border-b border-border pb-4` to header container.
- Textarea: `bg-background` → `bg-surface-tint`. Add `style={{ boxShadow: 'inset 0 2px 4px rgba(18,20,23,0.03)' }}`. `text-sm` → `text-[15px]`.
- Save button (`saveState !== 'saved'`): apply `className="btn-primary flex-1"`.
- Save button (`saveState === 'saved'`): keep `bg-success text-white`, change `rounded-xl` → `rounded-full`.
- Cancel button: `border border-border bg-transparent text-muted-foreground rounded-full hover:bg-muted transition-colors`.
- Mobile grab handle: `w-10` → `w-12`. `bg-border` → `bg-muted-fg/30`.

**Unchanged:** saveNote action, logJournalOpened, all state logic, animation classes, Escape key handler, scroll lock.

---

### Member Nav

**Exact scope:**
- Backdrop blur: `blur(12px)` → `blur(16px)` in both header and mobile nav (both `backdropFilter` and `WebkitBackdropFilter`).
- Wordmark opacity: `0.65` → `0.8`.
- Desktop active link: `"text-foreground bg-foreground/6"` → `"text-primary bg-primary/8 font-semibold"`.
- Mobile active link: keep `text-primary`. Add dot indicator beneath each nav item:
  ```tsx
  <span
    className={`block w-1 h-1 rounded-full mx-auto mt-0.5 ${isActive ? 'bg-primary' : 'bg-transparent'}`}
    aria-hidden="true"
  />
  ```

**Unchanged:** tier detection, coaching link logic, all NavIcon SVGs, item ordering, bottom bar structure.

---

### Shared Cards / Containers

**Exact scope (targeted shadow upgrades):**
- `account/page.tsx` section cards: `shadow-soft` → `shadow-medium`
- `billing-button.tsx` card: `shadow-soft` → `shadow-medium`
- `timezone-form.tsx` form card: `shadow-soft` → `shadow-medium`
- `JournalList.tsx` note cards: `shadow-soft` → `shadow-medium`
- `CoachingUpgradePrompt.tsx` inner card: add `shadow-medium`

**Do NOT change:**
- WeeklyPrincipleCard, MonthlyThemeCard — already intentional
- LibraryList cards — defer

---

### Library and Coaching Headers

**Exact scope:**
- `library/page.tsx`: Add `hero` to PageHeader.
- `coaching/page.tsx`: Add `hero` to PageHeader. Replace "no upcoming call" raw div with EmptyState component.

**Unchanged:** All query logic, tier gating, filter tabs, pagination, coaching replay cards.

---

## 5. Implementation Order

Mandatory execution sequence. Work through it in order.

```
Step 1 — app/globals.css
  Add .member-hero, .btn-primary, .member-input
  Foundation — everything else depends on these classes.

Step 2 — components/member/PageHeader.tsx
  Add hero?: boolean prop
  Second dependency — needed by all page headers.

Step 3 — components/member/EmptyState.tsx
  Improve visual weight
  Third dependency — needed by journal and coaching.

Step 4 — Account page (all four files)
  page.tsx → hero mode, card shadow upgrades, membership accent border
  account-client.tsx → .member-input inputs, .btn-primary submit
  billing-button.tsx → shadow-medium, hover state, arrow icon
  timezone-form.tsx → .member-input select, .btn-primary save

Step 5 — Journal page (three files)
  journal/page.tsx → PageHeader hero + right prop, EmptyState action
  NewJournalEntryButton.tsx → .btn-primary
  JournalList.tsx → shadow-medium, left borders, month divider sizing

Step 6 — NoteSheet
  notes/NoteSheet.tsx — header, textarea surface, buttons, grab handle

Step 7 — MemberTopNav
  MemberTopNav.tsx — blur, opacity, active states, dot indicator

Step 8 — Library + Coaching (two files)
  library/page.tsx → hero prop
  coaching/page.tsx → hero prop, EmptyState for no-call state

Step 9 — Build verification
  npm run build — must pass zero errors
  Confirm no new files in supabase/migrations/
  Commit + push
```

---

## 6. Verification Standard

Sprint 11 is not accepted until all items are confirmed.

### Database / Schema
- [ ] No schema changes were made in this sprint
- [ ] No new migration files created — `supabase/migrations/` has no files beyond `0011_tier_gating_coaching.sql`
- [ ] Migrations 0001–0011 confirmed applied on Supabase project `qdnojizzldilqpyocora`

### Build
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] No new ESLint errors introduced
- [ ] No new untyped `any` values introduced

### Visual Consistency
- [ ] All member pages have consistent `.member-hero` hero section treatment
- [ ] All primary action buttons use `.btn-primary` (pill + gradient + shadow)
- [ ] All member-facing form inputs use `.member-input` (no JS focus handlers remain)
- [ ] Journal note cards have content-type left borders
- [ ] Card shadows across account/journal sections visually deeper than before
- [ ] Nav active state clearly visible at a glance on desktop (`bg-primary/8 text-primary`)
- [ ] Mobile nav has dot indicator on active item
- [ ] No new color values outside existing `globals.css` tokens

### Marketing/Member Cohesion
- [ ] Hero radial-gradient pattern matches between Today page and account/journal
- [ ] Button gradient matches marketing CTAs (`#2F6FED → #245DD0`)
- [ ] Pill-shaped buttons throughout member area

### Functional Regression
- [ ] Account: password form submits and sets password
- [ ] Account: timezone saves
- [ ] Account: billing portal redirect works
- [ ] Journal: clicking a note opens NoteSheet with correct content
- [ ] Journal: New Entry button opens NoteSheet with null contentId
- [ ] NoteSheet: save persists note and closes
- [ ] NoteSheet: cancel restores original text
- [ ] NoteSheet: Escape key closes sheet
- [ ] Library: filter tabs, search, and pagination all function
- [ ] Coaching: tier gate shows upgrade prompt for L1/L2, coaching content for L3+
- [ ] Nav: all links navigate correctly, active state updates on route change

---

## 7. Final Build Prompt

Use this prompt verbatim when handing off to the IDE agent.

---

You are implementing Sprint 11 for the Positives platform.

This is a pure UI/UX polish sprint.
No schema changes. No new migrations. No new features.
No new components beyond the ones explicitly specified below.

Your implementation contract is SPRINT_11_LOCKED_PLAN.md.
Follow it exactly. If there is a conflict between any older doc and this plan, SPRINT_11_LOCKED_PLAN.md wins.

Database status confirmed: All migrations 0001–0011 are applied on Supabase project qdnojizzldilqpyocora. No DB work needed.

BEFORE WRITING ANY CODE:
1. Read .agents/skills/brand-identity/SKILL.md
2. Read .agents/skills/brand-identity/resources/design-tokens.json
3. Read app/(marketing)/landing-client.tsx — internalize the exact radial-gradient hero, button gradient, and shadow patterns you must replicate

Then implement in this exact order. Complete each step fully before moving to the next.

────────────────────────────────────────────
STEP 1 — app/globals.css

Add a new section at the end of the file:

  /* ─── Member UI Utilities ─────────────────────────────────────────────────── */

Add exactly three classes: .member-hero, .btn-primary, .member-input
Use the exact CSS defined in SPRINT_11_LOCKED_PLAN.md §3.

────────────────────────────────────────────
STEP 2 — components/member/PageHeader.tsx

Add optional `hero?: boolean` prop (defaults to false).

When hero={true}:
- Wrap entire output in <section className="member-hero">
- Replace <header className="mb-8"> inner wrapper with <div className="member-container py-10 md:py-14">
- The h1, subtitle, and right slot render inside this div

When hero={false}: preserve existing behavior exactly. Backward-compatible — no existing usage breaks.

────────────────────────────────────────────
STEP 3 — components/member/EmptyState.tsx

Wrap the entire return in:
  <div className="bg-card/60 rounded-2xl border border-border/50 p-8 md:p-12 mx-auto max-w-sm text-center flex flex-col items-center gap-3">

Icon container: change to w-14 h-14 rounded-full bg-muted/80
Title: text-foreground text-base font-semibold
Subtitle: text-sm text-muted-foreground (unchanged)
Action slot: unchanged

────────────────────────────────────────────
STEP 4 — Account page (all four files)

account/page.tsx:
- PageHeader: add hero prop → <PageHeader title="Account" hero />
- Membership card: shadow-soft → shadow-large, add border-l-[3px] border-l-secondary
- Replace <span className="text-[10px]...Active</span> badge with:
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
      <span className="w-2 h-2 rounded-full bg-secondary inline-block" aria-hidden="true" />
      {member?.subscription_status ?? "active"}
    </span>
- All other section cards: shadow-soft → shadow-medium

account/account-client.tsx:
- Both password <input> elements: remove onFocus and onBlur handlers entirely, apply className="member-input" (remove all other className strings from the inputs)
- SubmitButton <button>: remove the entire style={{}} block. Apply className="btn-primary w-full". Keep pending state with opacity adjustment via disabled + opacity-40 from .btn-primary:disabled.

billing-button.tsx:
- Outer card div: shadow-soft → shadow-medium, add hover:bg-muted/30 transition-colors
- "Billing →" button: append after text:
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>

timezone-form.tsx:
- <select>: replace className with "member-input"
- Save <button>: change from text link to:
    <button type="submit" disabled={isPending} onClick={...} className="btn-primary self-start" style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>

────────────────────────────────────────────
STEP 5 — Journal page (three files)

journal/page.tsx:
- Remove the outer <div className="flex items-start justify-between gap-4 mb-6"> wrapper entirely
- Replace with: <PageHeader title="Your Notes" subtitle="Reflections from your practice, in your own words." hero right={<NewJournalEntryButton />} />
- EmptyState: add action={<NewJournalEntryButton />} prop

NewJournalEntryButton.tsx:
- Remove inline style={{ background: ..., color: ... }}
- Change className to "btn-primary"

JournalList.tsx:
- Note card <button>: shadow-soft → shadow-medium
- Note card <button>: add left border class based on note.content_type:
    note.content_type === 'daily_audio'      → append 'border-l-[3px] border-l-primary'
    note.content_type === 'weekly_principle' → append 'border-l-[3px] border-l-secondary'
    note.content_type === 'monthly_theme'    → append 'border-l-[3px] border-l-accent'
    null or other                            → no additional class
- Month divider <span>: text-[10px] → text-xs, text-muted-foreground/60 → text-muted-foreground

────────────────────────────────────────────
STEP 6 — components/notes/NoteSheet.tsx

In NoteSheetContent, inside the header flex row:
- Replace <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground truncate pr-4"> with:
    <div className="flex items-center gap-2 min-w-0">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted-foreground flex-shrink-0">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
      <p className="text-sm font-medium text-foreground truncate">{headerTitle}</p>
    </div>
- Add border-b border-border pb-4 to the header row outer div (the flex items-center justify-between div)

Textarea:
- bg-background → bg-surface-tint
- Add to the className array: "shadow-[inset_0_2px_4px_rgba(18,20,23,0.03)]"
- text-sm → text-[15px]

Save button (saveState !== 'saved' branch):
- Replace className string with "btn-primary flex-1"

Save button (saveState === 'saved' branch):
- "flex-1 py-2.5 rounded-full text-sm font-medium bg-success text-white"

Cancel button:
- Replace className with "flex-1 py-2.5 rounded-full text-sm font-medium border border-border bg-transparent text-muted-foreground hover:bg-muted transition-colors"

Mobile grab handle:
- w-10 → w-12
- bg-border → bg-muted-fg/30 (or use style={{ background: 'rgba(104,112,122,0.3)' }} if the Tailwind class doesn't resolve)

────────────────────────────────────────────
STEP 7 — components/member/MemberTopNav.tsx

Desktop header style prop: blur(12px) → blur(16px) (both backdropFilter and WebkitBackdropFilter)
Mobile nav style prop: blur(12px) → blur(16px) (both backdropFilter and WebkitBackdropFilter)
Wordmark Image: style={{ ..., opacity: 0.65 }} → opacity: 0.8

Desktop active link className:
  "text-foreground bg-foreground/6" → "text-primary bg-primary/8 font-semibold"

Mobile nav: Inside each <li>, below the <Link> element, add a dot indicator:
  <span
    className={`block w-1 h-1 rounded-full mx-auto -mt-1 ${isActive ? 'bg-primary' : 'bg-transparent'}`}
    aria-hidden="true"
  />

────────────────────────────────────────────
STEP 8 — Library + Coaching

library/page.tsx:
  <PageHeader title="Library" subtitle="Your archive of practices, principles, and themes." hero />

coaching/page.tsx:
  <PageHeader title="Coaching" subtitle="Weekly live calls with Dr. Paul Jenkins. Join live or watch the replay." hero />
  Replace the "no upcoming call" raw <div> with:
    <EmptyState
      icon={<svg ...calendar or video icon... />}
      title="No upcoming call scheduled"
      subtitle="Check back soon — a call will be added when scheduled."
    />

────────────────────────────────────────────
STEP 9 — Verification

Run: npm run build

Fix any TypeScript errors. Do not proceed with commit if build fails.

Confirm before committing:
- No new files in supabase/migrations/
- No schema changes
- All primary action buttons are pill + gradient (.btn-primary)
- All member form inputs are .member-input style (no JS focus handlers)
- Hero sections consistent across all member pages
- No color values outside defined CSS tokens

Commit with message: "sprint 11: member visual cohesion — design alignment polish"
Push to origin.
