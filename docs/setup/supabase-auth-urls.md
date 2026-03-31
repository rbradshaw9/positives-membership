# Supabase Auth URL Configuration

**Purpose:** Exact settings required in the Supabase dashboard for production and local development.

Incorrect Supabase dashboard settings are the most common cause of magic links redirecting to
`localhost` instead of the live domain, because Supabase validates `emailRedirectTo` against
the allowlist — and silently falls back to the Site URL if the value is not allowed.

---

## Production Settings

Go to **Supabase Dashboard → Authentication → URL Configuration**

### Site URL
```
https://positives-membership.vercel.app
```

### Redirect URLs (allowlist — one per line)
```
https://positives-membership.vercel.app/**
http://localhost:3000/**
```

The wildcard `/**` covers all paths including `/auth/callback?next=/today` and any
future deep-link variations without requiring per-path entries.

> **Do not set Site URL to `http://localhost:3000` in production.** If it's set to
> localhost, every magic link email will redirect there, regardless of what the app
> sends as `emailRedirectTo`.

---

## How the redirect path flows

```
User requests magic link
  └── login/page.tsx calls supabase.auth.signInWithOtp({
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/today`
        }
      })
        │
        ▼
  Supabase validates emailRedirectTo against the allowlist
  If allowed → email link points to that URL
  If NOT allowed → Supabase falls back to Site URL (the localhost bug)
        │
        ▼
  User clicks email link → hits /auth/callback?code=...&next=/today
        │
        ▼
  app/auth/callback/route.ts exchanges code for session
  Redirects to origin + next (e.g. /today or /subscribe)
```

---

## Local Development Settings

For local dev, the allowlist already includes `http://localhost:3000/**` above.

Your `.env.local` must have:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

This is only used by the Stripe checkout flow (`success_url`, `cancel_url`) —
not by the auth redirect, which derives the origin from `window.location.origin` at runtime.

---

## Verifying the Settings Are Working

1. Trigger a magic link from the live site
2. Check the email — the link should point to `https://positives-membership.vercel.app/auth/callback?...`
3. If it still points to `localhost`, the **Site URL** in Supabase is wrong

In Vercel logs, after clicking the link you should see the callback route execute.
The `[Stripe]` logs will appear only after checkout — not during auth.
