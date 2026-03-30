# Supabase Setup — Positives Platform

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your project URL and anon key from **Project Settings → API**.
3. Note your service role key (keep this secret — server-only).

---

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 3. Apply migrations

Migrations live in `supabase/migrations/`. Apply them in order.

### Option A — Supabase SQL Editor (simplest)

1. Open your project in the Supabase dashboard.
2. Go to **SQL Editor**.
3. Paste and run each migration file in order:
   - `0001_initial_schema.sql`
   - `0002_rls_policies.sql`
   - `0003_member_bootstrap_trigger.sql`

### Option B — Supabase CLI

Install the CLI and link your project:

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
```

Then push all migrations:

```bash
supabase db push
```

> **Note:** `supabase db push` applies all files in `supabase/migrations/` in filename order. Do not reorder or rename migration files.

---

## 4. Apply seed data (development only)

After migrations are applied, seed one test content row so `/today` returns real data:

```bash
# Via psql (get the connection string from Project Settings → Database)
psql "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" < supabase/seed.sql
```

Or paste `supabase/seed.sql` into the SQL Editor.

> Do **not** apply seed data to a production database.

---

## 5. Generate TypeScript types

After connecting to a live project, regenerate `types/supabase.ts` from your actual schema:

```bash
npx supabase gen types typescript \
  --project-id your-project-ref \
  > types/supabase.ts
```

This replaces the manually maintained scaffold with accurate auto-generated types.  
Re-run this whenever you add or modify schema migrations.

---

## 6. Configure Auth

In the Supabase dashboard, go to **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (dev) or your production URL
- **Redirect URLs:** add `http://localhost:3000/auth/callback`

For production, add your Vercel deployment URL.

---

## 7. Verify the member bootstrap trigger

After applying `0003_member_bootstrap_trigger.sql`, the `handle_new_user` trigger automatically creates a `member` row whenever a new user signs up.

To verify it's active:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

If the trigger is missing, re-run `0003_member_bootstrap_trigger.sql`.
