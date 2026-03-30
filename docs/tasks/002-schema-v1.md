# Task 002 — Schema V1

## Goal
Create the initial database schema and RLS baseline for the Positives platform.

## Scope
Included:
- `member`
- `content`
- `progress`
- `journal`
- `community_post`
- indexes
- RLS policies

Excluded:
- coaching tables
- analytics tables
- ingestion job tables
- castos publication tracking extensions

## Files
- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_rls_policies.sql`

## Verification
- migrations apply cleanly
- RLS enabled
- basic query assumptions are valid