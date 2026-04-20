# Stripe Customer Reconciliation

Use this runbook when a member record has a `stripe_customer_id` that no longer resolves in the active Stripe account, or when the admin CRM shows stale billing warnings.

## Read-Only Audit

Run:

```bash
npm run stripe:audit-customers -- --stale-only
```

Useful targeted checks:

```bash
npm run stripe:audit-customers -- --email "member@example.com" --include-payments
npm run stripe:audit-customers -- --customer "cus_..." --include-payments
npm run stripe:audit-customers -- --output tmp/stripe-customer-audit.json
```

The audit checks each `member.stripe_customer_id` against the configured Stripe account and classifies it as:

- `ok`: the customer exists and is active in Stripe.
- `deleted`: Stripe returned a deleted customer object.
- `missing`: Stripe returned `resource_missing`.
- `stripe_error`: another Stripe API error occurred.

For stale rows, the audit also searches Stripe customers by the member email and reports possible replacement customer IDs.

## Reconciliation Rule

Do not automatically relink or clear production `stripe_customer_id` values from the audit alone.

Recommended review path:

1. Confirm whether the app is pointed at the intended Stripe mode and account.
2. Compare the member email, Stripe customer email, payment history, and subscription state.
3. If there is one obvious replacement customer, relink only after admin approval and an audit note.
4. If there is no trustworthy match, clear the stale customer only after confirming the member should not have active billing management.
5. Re-run the member CRM billing summary/backfill after any approved relink.

## Why This Is Manual

Stripe customer IDs affect billing portal access, plan-change previews, LTV summaries, and support context. A wrong automatic relink can attach one person’s billing history to another member record, so reconciliation must stay human-reviewed until we have a stronger deterministic match model.
