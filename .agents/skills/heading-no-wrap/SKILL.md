---
name: heading-no-wrap
description: Prevents single-word orphan lines in headings across all Positives pages. Apply whenever writing or editing any heading (h1, h2, h3) on any page in this repository.
---

# Heading No-Wrap Rule

## Rule

**No heading on any Positives page may ever wrap so that a single word sits alone on its own line.**

This is a hard design rule. Every heading must be proofread for orphan words before committing.

---

## Techniques — Apply in this order

### 1. `text-wrap: balance` (preferred, CSS only)

Add `textWrap: "balance"` to any heading element. The browser automatically distributes text across lines to avoid orphans and single-word trailing lines.

```tsx
<h1
  style={{
    fontSize: "clamp(2rem, 5vw, 4.5rem)",
    textWrap: "balance",  // ← prevents orphan word wraps
    letterSpacing: "-0.045em",
    lineHeight: "1.06",
  }}
>
  Choose your starting point.
</h1>
```

> Note: `textWrap: "balance"` is a newer CSS property. It is well-supported in all modern browsers (Chrome 114+, Safari 17.5+, Firefox 121+). Use it freely for this project.

---

### 2. `whiteSpace: "nowrap"` on the last meaningful phrase (when `balance` isn't enough)

Wrap the last 2–3 words in a `<span>` with `display: "inline"` and `whiteSpace: "nowrap"` so they cannot be separated.

```tsx
<h2 style={{ fontSize: "clamp(2rem, 4.5vw, 3.75rem)", letterSpacing: "-0.045em" }}>
  30-day money-back{" "}
  <span style={{ whiteSpace: "nowrap" }}>guarantee.</span>
</h2>
```

---

### 3. `display: "block"` spans for explicit line control (for 2-line hero headings)

For hero headlines structured as exactly two lines (like the homepage hero), wrap each line in a `<span style={{ display: "block", whiteSpace: "nowrap" }}>` so each phrase is always a single unbreakable line.

```tsx
<h1 style={{ fontSize: "clamp(3rem, 7.5vw, 7rem)" }}>
  <span style={{ display: "block", whiteSpace: "nowrap" }}>A few minutes each day.</span>
  <span style={{ display: "block", whiteSpace: "nowrap" }}>A more positive life.</span>
</h1>
```

---

### 4. Controlled `maxWidth` on the heading container

Limit the container width so the heading wraps in a predictable location rather than at the viewport edge.

```tsx
<h2 style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", maxWidth: "18ch" }}>
  A simple practice that builds real change.
</h2>
```

---

## When to Apply

Apply this skill to **every heading** when:

- Writing a new page or section
- Editing any existing heading copy
- Reviewing a redesign diff
- Any heading uses `clamp()` font sizes (these are the most susceptible to orphans at mid-range viewport widths)

---

## Audit Checklist

Before committing any heading change, mentally check it at these viewport widths:

| Width | Risk |
|---|---|
| 375px | Mobile — is the heading splitting badly? |
| 768px | Tablet — where does it wrap? |
| 1024px | Laptop — the most common orphan zone |
| 1440px | Desktop — does it look intentional? |

If ANY viewport produces a single-word final line, fix it using one of the techniques above before committing.

---

## Current Implementation in This Repository

The following headings already use `display: block` + `whiteSpace: nowrap`:

- Homepage hero: "A few minutes each day." / "A more positive life."
- Final CTA: "A few minutes each day." / "A more positive life."

All other headings should use `textWrap: "balance"` as the default.
