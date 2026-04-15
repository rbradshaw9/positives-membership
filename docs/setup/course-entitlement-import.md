# Legacy Course Entitlement Import

Use this when importing existing course-only buyers into Positives so they keep
permanent access to purchased courses without needing an active subscription.

## Import Command

Dry-run first:

```bash
npm run courses:import-legacy -- --file imports/legacy-course-buyers.csv --dry-run
```

Run the import:

```bash
npm run courses:import-legacy -- --file imports/legacy-course-buyers.csv
```

The importer reads `.env.local` and requires:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The default report is written to:

```txt
tmp/course-entitlement-import-report.json
```

## CSV Format

Required:

- `email`
- `course_slug` or `course_id`

Recommended:

- `name`
- `purchase_date`
- `legacy_transaction_id`
- `legacy_product_id`
- `legacy_course_id`
- `legacy_member_id`
- `legacy_source`

Example:

```csv
email,name,course_slug,purchase_date,legacy_transaction_id,legacy_product_id,legacy_member_id,legacy_source
member@example.com,Example Member,core-course,2025-03-15,txn_123,legacy_product_456,legacy_contact_789,keap
```

## Behavior

- Existing active member/course entitlements are skipped.
- Missing members are created as inactive course-only members.
- Imported entitlements use `source = migration`.
- Imported entitlements are permanent unless later revoked, refunded, or marked chargeback.
- Subscription state is not required and is not created by this import.
- Each successful grant writes an `activity_event` audit row.

## Mismatch Report

The report includes:

- missing emails
- unknown or ambiguous courses
- created members
- granted entitlements
- skipped existing entitlements
- row-level errors

Unknown courses usually mean the CSV needs a valid `course_slug` or `course_id`
mapped from the legacy product/course ID.
