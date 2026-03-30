# Milestone 01 — Foundation

## Objective

Establish the production-ready foundation for the Positives platform.

This milestone should create the base application architecture, auth and access scaffolding, initial schema, Stripe webhook skeleton, protected member shell, admin shell, and starter `/today` experience.

This milestone is intentionally narrow.

Do not implement full product functionality yet.

## Included Scope

### App Structure
- Next.js App Router structure
- route groups for marketing, member, and admin
- shared layouts
- base navigation scaffolding

### Auth
- Supabase client setup
- browser and server helpers
- auth session handling
- protected member route pattern
- protected admin route pattern scaffold

### Database
- initial schema v1
- SQL migration files
- row level security baseline
- typed data modeling where appropriate

### Billing
- Stripe config scaffold
- webhook endpoint scaffold
- webhook signature verification scaffold
- subscription state update scaffold

### Member Experience
- protected member area shell
- `/today` route shell
- placeholder card for latest daily practice
- placeholder sections for This Week and This Month

### Admin Experience
- admin route shell
- placeholder ingestion review area
- placeholder content management area

### Configuration
- `.env.example`
- central config helpers
- service-specific environment validation

## Explicitly Out of Scope

Do not implement in this milestone:
- real Google Drive ingestion
- S3 upload pipeline
- transcription
- AI title / description generation
- Castos publishing
- Vimeo content playback
- journaling
- streak logic
- community
- coaching scheduling
- email automation
- SMS reminders
- advanced analytics

## Expected Route Structure

- `/`
- `/login`
- `/dashboard`
- `/today`
- `/library` (shell only if needed)
- `/admin`
- `/admin/content`
- `/admin/ingestion`

## Required Data Tables in v1

At minimum define:

- `member`
- `content`
- `progress`
- `journal`
- `community_post`

Even if some features are not active yet, the schema should reflect the intended platform model.

## Content Types

The `content` table should support:

- `daily_audio`
- `weekly_principle`
- `monthly_theme`
- `library`
- `workshop`

## Required Fields

### member
- id
- email
- name
- avatar_url
- stripe_customer_id
- subscription_status
- subscription_tier
- subscription_end_date
- practice_streak
- last_practiced_at
- created_at

### content
- id
- title
- description
- type
- vimeo_video_id
- s3_audio_key
- castos_episode_url
- transcription
- ai_generated_title
- ai_generated_description
- duration_seconds
- published_at
- month_theme
- tags
- is_active
- created_at
- updated_at

### progress
- id
- member_id
- content_id
- listened_at
- completed
- reflection_text

### journal
- id
- member_id
- content_id
- entry_text
- created_at

### community_post
- id
- member_id
- content_id
- body
- post_type
- created_at

## Security Requirements

- enable RLS on all tables
- members can only access their own profile, progress, and journal data
- community posts readable by authenticated active members, writable only by owner
- protected member routes enforced server-side
- do not rely on client-side billing state

## Technical Requirements

- use Next.js App Router
- keep code modular
- use Supabase as source of truth
- use Stripe as billing authority
- prepare for future Google Drive → S3 ingestion
- prepare for future Castos publishing
- prepare for future Vimeo video content

## Deliverables

By the end of Milestone 01, the repo should contain:

- clean app structure
- config helpers
- Supabase setup
- Stripe setup scaffold
- SQL migration(s)
- middleware or equivalent protected route approach
- member dashboard shell
- `/today` shell
- admin shell
- baseline README updates if needed

## Success Criteria

Milestone 01 is successful when:

- the app runs locally
- auth scaffolding is in place
- protected member routes work structurally
- Stripe webhook endpoint exists and verifies signatures
- schema v1 exists in migrations
- `/today` renders inside protected member area
- admin shell exists
- codebase remains clean and extendable