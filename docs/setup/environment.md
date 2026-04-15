# Environment Variables — Positives Platform

Reference for all environment variables used by the platform.

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local`.

---

## Required for Milestone 02

These must be set for the app to function locally.

### App

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | No | Base URL (defaults to `http://localhost:3000`) |
| `NODE_ENV` | No | Set automatically by Next.js |
| `ADMIN_EMAILS` | Yes (admin) | Comma-separated list of admin email addresses |

### Supabase

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Service role key — server-only, never expose to browser |

Find these in: **Supabase Dashboard → Project Settings → API**

### Stripe

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Yes** | Secret key — server-only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Publishable key — for client-side Stripe.js (Milestone 03+) |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Signing secret from `stripe listen` or Stripe dashboard |

### Stripe Price IDs

Required for webhook tier mapping. Set once your Stripe products are created.

| Variable | Required | Description |
|---|---|---|
| `STRIPE_PRICE_LEVEL_1_MONTHLY` | When billing active | Level 1 monthly price ID |
| `STRIPE_PRICE_LEVEL_2_MONTHLY` | When billing active | Level 2 monthly price ID |
| `STRIPE_PRICE_LEVEL_3_MONTHLY` | When billing active | Level 3 monthly price ID |
| `STRIPE_PRICE_LEVEL_4_THREE_PAY` | When L4 billing active | Level 4 three-pay price ID |
| `STRIPE_PRODUCT_LEVEL_4` | When L4 billing active | Level 4 product ID |
| `STRIPE_PRICE_LEVEL_1_ANNUAL` | Optional | Level 1 annual price ID |
| `STRIPE_PRICE_LEVEL_2_ANNUAL` | Optional | Level 2 annual price ID |
| `STRIPE_PRICE_LEVEL_3_ANNUAL` | Optional | Level 3 annual price ID |

---

## Required for later milestones

These are not needed for Milestone 02 but are documented here for completeness.

### Vimeo

| Variable | Milestone | Description |
|---|---|---|
| `VIMEO_ACCESS_TOKEN` | 04+ | For video playback |
| `VIMEO_CLIENT_ID` | 04+ | OAuth client ID |
| `VIMEO_CLIENT_SECRET` | 04+ | OAuth client secret |

### AWS / S3

| Variable | Milestone | Description |
|---|---|---|
| `AWS_REGION` | Ingestion | S3 region |
| `AWS_ACCESS_KEY_ID` | Ingestion | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Ingestion | IAM secret key |
| `S3_BUCKET_NAME` | Ingestion | Audio storage bucket |

### Google Drive

| Variable | Milestone | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Ingestion | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Ingestion | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Ingestion | Long-lived refresh token |
| `GOOGLE_DRIVE_DAILY_AUDIO_FOLDER_ID` | Ingestion | Folder ID to watch |

### Castos

| Variable | Milestone | Description |
|---|---|---|
| `CASTOS_API_KEY` | Ingestion | Private podcast feed API key |
| `CASTOS_SHOW_ID` | Ingestion | Target show ID |

### Email / SMS

| Variable | Milestone | Description |
|---|---|---|
| `ACTIVECAMPAIGN_API_URL` | 04+ | ActiveCampaign API endpoint |
| `ACTIVECAMPAIGN_API_KEY` | 04+ | ActiveCampaign key |
| `TWILIO_ACCOUNT_SID` | 04+ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | 04+ | Twilio auth token |
| `TWILIO_FROM_NUMBER` | 04+ | Sending phone number |

### AI

| Variable | Milestone | Description |
|---|---|---|
| `OPENAI_API_KEY` | Ingestion | For AI title/description generation |

---

## Where these go in production

Set production environment variables in the Vercel dashboard:  
**Project → Settings → Environment Variables**

Do not commit `.env.local` to the repository — it is gitignored.
