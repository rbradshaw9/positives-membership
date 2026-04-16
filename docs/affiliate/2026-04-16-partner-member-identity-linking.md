# Partner And Member Identity Linking Model

## Summary

Positives should use the simplest identity model that stays operationally safe:

- exact same email means the same person account
- different emails mean different accounts by default
- never auto-merge by name alone
- partner status and member status are roles on top of a person account, not
  separate truths about the same email

This preserves clean attribution, avoids dangerous merges, and fits the current
Supabase auth and admin CRM model.

## Locked Decisions

- The current authenticated person record stays the canonical app identity.
- A user can be:
  - member-only
  - partner-only
  - member-and-partner
- If someone becomes both partner and member under the same normalized email,
  keep one account and enrich it.
- If the emails differ, keep separate accounts unless support manually decides
  otherwise after verification.
- Do not auto-link by name, phone, or payout email.
- Payout email is not identity. It is payout metadata only.
- FirstPromoter remains the attribution source of truth, but Positives owns the
  local identity relationship to that promoter.

## Recommended Canonical Model

### Canonical identity

Use the Positives authenticated account as the local person record.

In practical terms, that means the existing `member` row remains the canonical
identity record even when the person is not an active subscriber.

That allows Positives to represent:

- active subscribers
- canceled subscribers
- course-only buyers
- partner-only affiliates
- member-and-partner users

without introducing a second auth system.

### Affiliate / partner state

Affiliate and partner metadata should attach to that person record, whether
through the existing affiliate fields or a future companion profile table.

The key linking fields are:

- app person/member ID
- normalized email
- `fp_promoter_id`
- affiliate/partner role state

## Identity States

Use these operational states:

- `member_only`
  - has product access
  - no partner status
- `partner_only`
  - can use the affiliate portal
  - no paid member entitlement
- `member_and_partner`
  - has product access and affiliate status

This is easier to reason about than separate parallel identities.

## Auto-Linking Rules

### Safe auto-linking

Auto-link only when:

- the normalized email is exactly the same
- and the account is clearly intended to represent the same person

Examples:

- existing member applies to become an affiliate using the same email
- existing partner later buys membership using the same email
- member had affiliate status added later using the same email

### Do not auto-link

Do not auto-link when:

- names match but email differs
- payout email differs
- spouse or assistant is involved
- a coach refers members under a business email while having a personal member
  email
- historical import data only "looks similar"

In those cases, keep separate records unless a verified manual merge policy is
created later.

## Manual Review Cases

Support/admin should review instead of auto-linking when:

- same human may span business and personal emails
- spouse or household partner scenarios exist
- the person explicitly asks to combine records
- payout data and account data do not line up
- imported legacy affiliate and new Positives identity data conflict

If a manual merge workflow is ever introduced, it should require:

- explicit verification
- audit logging
- a reason
- preservation of prior attribution history

## How This Works With FirstPromoter

FirstPromoter promoter records should map to one local Positives person record
at a time.

Recommended rules:

- one `fp_promoter_id` maps to one canonical local account
- one local account can hold one active `fp_promoter_id`
- if the same email later becomes a subscriber, keep the same local account and
  the same `fp_promoter_id`
- if a different email becomes a subscriber, create a separate local account by
  default

This keeps affiliate attribution stable while letting the product layer evolve.

## How This Works With Purchases

### If a partner later buys membership with the same email

- enrich the same local account
- keep affiliate history
- keep promoter link
- change the account state to `member_and_partner`

### If a member later becomes an affiliate with the same email

- keep the same local account
- create or link the FirstPromoter promoter
- keep the product history untouched

### If a course or membership is bought with a different email

- do not auto-merge
- let the purchase live on the email that completed checkout
- only link later through a deliberate support workflow if ever needed

## Self-Referral Protection

This model also keeps self-referral logic cleaner.

When checking whether a referral should be disallowed, compare against:

- canonical local account email
- linked `fp_promoter_id`
- Stripe customer identity where available

Do not rely only on marketing cookies or payout email.

## Recommended Admin CRM Visibility

The member CRM should eventually show:

- account role state:
  - member-only
  - partner-only
  - member-and-partner
- FirstPromoter promoter ID
- referral code and referral link
- payout readiness
- whether the current email is the canonical linked identity
- any manual-review flag when multiple identities may exist

This gives support and coaches the full picture without requiring them to infer
identity relationships from scattered fields.

## Why This Model Works

It follows the same pattern strong CRM systems use:

- one canonical person record
- multiple operational roles
- very conservative automatic linking
- manual review for ambiguous identity

That keeps the system simple, supportable, and much less likely to create messy
cross-account merges that are hard to unwind later.
