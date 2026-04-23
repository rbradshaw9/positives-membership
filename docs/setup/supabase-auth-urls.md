# Supabase Auth URL Configuration

**Purpose:** Exact settings required in the Supabase dashboard for production and local development.

Incorrect Supabase dashboard settings are the most common cause of magic links redirecting to
`localhost` instead of the live domain, because Supabase validates `emailRedirectTo` against
the allowlist — and silently falls back to the Site URL if the value is not allowed.

> ✅ **Current state (as of 2026-04-07):** Settings verified and applied via Supabase Management API.
> Site URL and allowlist match the values below.

---

## Production Settings

Go to **Supabase Dashboard → Authentication → URL Configuration**

### Site URL
```
https://positives.life
```

### Redirect URLs (allowlist — one per line)
```
https://positives.life/**
https://positives-membership.vercel.app/**
http://localhost:3000/**
```

The wildcard `/**` covers all paths including `/auth/callback?next=/today` and any
future deep-link variations without requiring per-path entries.

The `positives-membership.vercel.app` entry is kept as a fallback for Vercel preview
deployments and internal testing.

> **Do not set Site URL to `http://localhost:3000` in production.** If it's set to
> localhost, every magic link email will redirect there, regardless of what the app
> sends as `emailRedirectTo`.

### Auth Email Sending

Production auth/security email can be handled in two supported ways:

1. **Custom SMTP through Postmark** for a simple, dashboard-managed setup.
2. **Send Email Hook through the app + Postmark** for branded Positives HTML.

Do not enable the Supabase **Send Email Hook** unless the configured endpoint exists,
verifies the Supabase hook signature, and sends real email through Postmark. A missing
or non-sending hook will block magic links and password resets before any email is
delivered.

Expected branded launch setting after the route is deployed:

```
Authentication -> Hooks -> Send Email: enabled
Hook URL: https://positives.life/api/auth/send-email-hook
```

Required production environment variables:

```
SEND_EMAIL_HOOK_SECRET
POSTMARK_SERVER_TOKEN
POSTMARK_FROM_EMAIL
POSTMARK_REPLY_TO_EMAIL
POSTMARK_MESSAGE_STREAM
```

If the hook is disabled, Supabase falls back to the custom SMTP settings. This is a
safe fallback, but the app-owned branded template will not be used.

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
NEXT_PUBLIC_APP_URL="https://positives.life"
```

> Note: `NEXT_PUBLIC_APP_URL` is used by the Stripe checkout flow (`success_url`, `cancel_url`)
> and by the welcome email login URL construction in `handle-checkout.ts`.
> Auth redirects derive origin from `window.location.origin` at runtime.

For local Stripe testing, you may temporarily override this to `http://localhost:3000`
in your local shell — do not commit that change.

---

## Verifying the Settings Are Working

1. Trigger a magic link from the live site (`https://positives.life/login`)
2. Check the email — the link should point to `https://positives.life/auth/callback?...`
3. If it still points to `localhost`, the **Site URL** in Supabase is wrong

In Vercel logs, after clicking the link you should see the callback route execute.
The `[Stripe]` logs will appear only after checkout — not during auth.
