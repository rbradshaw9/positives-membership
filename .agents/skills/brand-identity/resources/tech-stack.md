# Positives — Tech Stack & Implementation Rules

When generating code or UI components for Positives, strictly adhere to the rules below.
These reflect the **actual live codebase** — not assumptions from training data.

## Core Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `app/` directory only — no `pages/` |
| Runtime | React 19 + TypeScript 5 | Server Components by default |
| Styling | Tailwind CSS v4 | `@import "tailwindcss"` — **not** `@tailwind base` |
| Video (primary) | Mux (`@mux/mux-player-react`) | `<VideoEmbed muxPlaybackId=... muxAssetId=... />` |
| Video (legacy) | Vimeo (`@vimeo/player`) | Existing content only; do not add new |
| Database / Auth | Supabase (SSR client) | Server-side only for auth/access checks |
| Payments | Stripe | Billing via Stripe Dashboard — no in-app billing UI |
| Rich-text editor (admin) | Tiptap v3 | `@tiptap/react`, `@tiptap/starter-kit`, `tiptap-markdown` |
| Markdown render (member) | react-markdown ^10 | Always wrap output with `.prose-positives` |
| Fonts | Poppins (body) + Montserrat (headings) | Loaded via `next/font/google` |

## Styling Rules

### ✅ DO
- Use **CSS custom properties** (`var(--color-primary)`, etc.) defined in `globals.css`
- Use **global CSS utility classes** from `globals.css` for layout and components:
  - `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`
  - `.surface-card`, `.surface-card--elevated`, `.surface-card--dark`, `.surface-card--editorial`
  - `.member-container`, `.member-shell`, `.member-hero`
  - `.filter-chip`, `.stat-card`, `.member-segmented-control`
  - `.prose-positives` (always wrap react-markdown output)
  - `.member-input`, `.admin-input`, `.search-field`
  - `.ui-section-eyebrow`, `.member-card-title`, `.member-body-copy`
- Use **Tailwind utility classes** for spacing, flex, grid, and fine-grained overrides
- Use **inline SVGs** for icons (no icon library is installed)

### ❌ DO NOT
- **Do not use shadcn/ui** — it is not installed. No `@/components/ui/*` imports.
- **Do not use Lucide React** — it is not installed. No `lucide-react` imports.
- **Do not use `@tailwind base/components/utilities`** — this is Tailwind v3 syntax. v4 uses `@import "tailwindcss"`.
- **Do not use the `theme()` function** — deprecated in Tailwind v4.
- **Do not create Pages Router files** — App Router only.
- **Do not reference Vimeo for new video content** — use Mux.
- **Do not reference Inter as the project font** — the project uses Poppins + Montserrat.

## Component Patterns

### Buttons
Always use the global CSS classes, not ad-hoc Tailwind:
```tsx
<button className="btn-primary">Start today</button>
<button className="btn-outline">Learn more</button>
```

### Cards
```tsx
<div className="surface-card p-6">...</div>
<div className="surface-card surface-card--dark p-6">...</div>
```

### Member layout
```tsx
<div className="member-container">
  <div className="member-hero px-5 py-10 md:py-14">…hero content…</div>
  …page content…
</div>
```

### Icons
Use inline SVG. No icon library available:
```tsx
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <polygon points="5,3 19,12 5,21" />
</svg>
```
