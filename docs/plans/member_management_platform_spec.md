# Member Management Platform Build Spec

## Purpose

Build a clean, reliable member management system for a paid membership platform. This system should manage people, plans, subscriptions, access rules, billing state, member self-service, admin operations, and communication triggers.

This is **not** just a login system. It is the operational layer that determines:

- Who a member is.
- What plan or access they have.
- Whether their subscription is active, trialing, past due, canceled, refunded, or expired.
- Which content, courses, events, resources, or platform areas they can access.
- What the member can manage themselves.
- What admins can see and change.
- What emails and lifecycle automations should run.

The target model is closest to a simplified version of **MemberPress / Paid Memberships Pro / WooCommerce Memberships / WildApricot / Memberful**, adapted for our own platform.

---

# 1. Research basis: how major member platforms work

The strongest membership systems share the same core patterns:

| Platform type | Examples | What they emphasize |
|---|---|---|
| WordPress membership plugins | MemberPress, Paid Memberships Pro, WooCommerce Memberships, Restrict Content Pro | Plans, subscriptions, access rules, protected content, checkout, account pages, admin member management |
| Hosted membership platforms | Memberful, WildApricot | Member database, subscriptions, billing, invoices, renewals, member profile, payment self-service, integrations |
| Community membership platforms | Circle, Mighty-style systems | Member profiles, spaces, paywalls, content access, community areas, events, courses, messaging |
| Billing infrastructure | Stripe Billing / Customer Portal | Subscriptions, invoices, payment methods, cancellations, payment recovery, billing self-service |

Key reference patterns:

- **MemberPress** uses memberships, groups/pricing pages, rules for content access, subscriptions, payments, and an account page where users manage account/subscription information.
- **Paid Memberships Pro** uses membership levels, checkout pages, member management, reports, content restriction, and member/account pages.
- **WooCommerce Memberships** uses membership plans to restrict content/products and grant member perks such as discounts.
- **WildApricot** emphasizes a centralized member database, renewals, dues collection, online payments, member directories, member profile, invoices, and member-facing renewal/payment management.
- **Memberful** emphasizes subscription plans, one-time payments, group subscriptions, refunds, discounts, retention flows, and a clean member account/subscription management interface.
- **Stripe Customer Portal** is a strong reference for billing self-service: update payment methods, view/download invoices, update/cancel subscriptions, and manage billing information.

The build should borrow the best parts of these systems, but stay focused. We do not need association complexity, board management, chapters, committees, advanced directories, or enterprise CRM behavior in V1.

---

# 2. Product definition

## What we are building

A membership management platform that supports:

1. Public pricing and plan selection.
2. Signup and checkout.
3. Member account creation.
4. Subscription lifecycle tracking.
5. Billing and invoice history.
6. Plan upgrades/downgrades/cancellations.
7. Member profile management.
8. Access control for content, courses, events, resources, and member-only pages.
9. Admin member database.
10. Admin subscription/order management.
11. Manual access grants and comps.
12. Member segmentation.
13. Lifecycle emails.
14. Basic reporting.

## What we are not building in V1

Do not build these unless explicitly requested later:

| Feature | V1 status |
|---|---|
| Full CRM pipeline | Not needed |
| Advanced association/chapter management | Not needed |
| Committee/board management | Not needed |
| Public member directory | Optional later |
| Complex group subscriptions | Optional later |
| Referral/affiliate tracking | Optional later |
| Gamification | Not needed |
| Full community/social network | Not part of member management core |
| Advanced marketing automation builder | Not needed in V1 |
| Complex taxes/accounting ledger | Use payment provider for billing/tax where possible |
| Manual invoice collections workflow | Basic invoice visibility only in V1 |
| Multi-tenant organization accounts | Optional later |

---

# 3. Core concepts

## Member

A **member** is a user with an account in the platform. A member may or may not currently have paid access.

Examples:

- Free registered user.
- Trial member.
- Active paid member.
- Course purchaser with no subscription.
- Canceled member who still has account history.
- Manually comped member.
- Admin-created member.

## Membership plan

A **membership plan** defines what someone can buy or be assigned.

Examples:

- Monthly Membership.
- Annual Membership.
- Founding Member.
- Community Only.
- Premium Membership.
- Lifetime Access.
- Free Trial.
- Internal/Comp Plan.

## Subscription

A **subscription** is the billing relationship that renews over time.

Examples:

- Monthly membership subscription through Stripe.
- Annual membership subscription through Stripe.
- Canceled subscription that remains active until period end.
- Past-due subscription after failed renewal payment.

## Entitlement / access grant

An **entitlement** is the actual access the member receives.

Examples:

- Can access member dashboard.
- Can access daily audio archive.
- Can access masterclass library.
- Can access Course A.
- Can register for member-only events.
- Can download member resources.

Important: billing status and platform access should be related but not treated as exactly the same object.

Recommended model:

```text
Plan / Product sold through checkout
  → creates Subscription or Purchase
    → creates Membership / AccessGrant / Entitlement
      → controls what the user can access
```

---

# 4. Required data model

Use structured records. Do not scatter access state across random user meta fields.

## Required entities

```text
User
MemberProfile
MembershipPlan
PlanFeature
Membership
Subscription
Order
Invoice
PaymentMethodReference
AccessRule
AccessGrant
MemberSegment
MemberNote
MemberActivityLog
EmailPreference
LifecycleEmail
Coupon / PromotionCode
```

## Optional later entities

```text
OrganizationAccount
GroupMembership
HouseholdMembership
MemberDirectoryProfile
Referral
CancellationSurvey
SupportCase
ManualInvoice
```

---

# 5. Entity descriptions

## User

The basic authentication/account entity.

Required fields:

| Field | Description |
|---|---|
| `id` | Unique user ID |
| `email` | Login and billing email |
| `password_hash` | If native auth is used |
| `role` | member, admin, support, content_manager, etc. |
| `status` | active, disabled, deleted |
| `created_at` | Account creation date |
| `last_login_at` | Last login timestamp |

Notes:

- Email should be unique unless the system intentionally supports multiple accounts per email, which is not recommended.
- Do not delete users when subscriptions cancel. Keep the account and history.

---

## MemberProfile

Stores member-facing profile and admin profile information.

Required fields:

| Field | Description |
|---|---|
| `user_id` | Linked user |
| `first_name` | First name |
| `last_name` | Last name |
| `display_name` | Public/internal display name |
| `phone` | Optional |
| `avatar_url` | Optional |
| `timezone` | Member timezone |
| `country` | Optional |
| `state_region` | Optional |
| `city` | Optional |
| `bio` | Optional, only if profiles are public later |
| `marketing_opt_in` | Email marketing consent |
| `sms_opt_in` | Optional |
| `created_at` | Profile creation timestamp |
| `updated_at` | Last update timestamp |

V1 does not need public social profiles unless the platform includes community features.

---

## MembershipPlan

Defines the thing a user can join or purchase.

Required fields:

| Field | Description |
|---|---|
| `id` | Unique plan ID |
| `name` | Public plan name |
| `slug` | URL slug |
| `description` | Public/admin description |
| `status` | draft, active, archived |
| `visibility` | public, hidden, invite_only, internal |
| `billing_type` | recurring, one_time, free, manual |
| `billing_interval` | month, year, lifetime, none |
| `price` | Amount in cents |
| `currency` | USD, etc. |
| `trial_days` | Optional |
| `signup_fee` | Optional |
| `stripe_product_id` | Optional external product mapping |
| `stripe_price_id` | Optional external price mapping |
| `sort_order` | Controls pricing display |
| `cta_label` | Join Now, Start Trial, Subscribe, etc. |
| `is_featured` | Highlight in pricing table |
| `created_at` | Created timestamp |
| `updated_at` | Last update timestamp |

Plan examples:

```text
Monthly Member — $29/month
Annual Member — $290/year
Lifetime Access — $997 one time
Free Account — $0
Comp Membership — internal/manual only
```

---

## PlanFeature

Defines what is displayed on pricing cards and optionally what access is included.

Fields:

| Field | Description |
|---|---|
| `id` | Feature ID |
| `plan_id` | Parent plan |
| `label` | Feature text, e.g. “Monthly masterclasses” |
| `feature_key` | Optional machine-readable key |
| `included` | Boolean |
| `sort_order` | Display order |

Separate display features from actual access rules where possible. Pricing-page bullet text is not enough to enforce access.

---

## Membership

Represents a user’s active or historical membership relationship.

Required fields:

| Field | Description |
|---|---|
| `id` | Unique membership ID |
| `user_id` | Member user |
| `plan_id` | Membership plan |
| `status` | active, trialing, past_due, canceled, expired, revoked, comped |
| `source` | checkout, admin, import, migration, comp, gift |
| `started_at` | Access start |
| `current_period_start` | Current billing/access period start |
| `current_period_end` | Current billing/access period end |
| `canceled_at` | If canceled |
| `cancel_at_period_end` | Boolean |
| `expires_at` | For one-time/limited access |
| `subscription_id` | Linked subscription, if recurring |
| `order_id` | Initial order, if applicable |
| `admin_note` | Optional internal note |
| `created_at` | Created timestamp |
| `updated_at` | Last update timestamp |

Important: a user can have more than one membership if the business model supports add-ons or separate products. But if the platform only supports one membership plan at a time, enforce plan-group exclusivity.

Recommended V1:

- Allow one primary membership subscription at a time.
- Allow additional course purchases or add-on access separately.
- Support manual access grants separately from the primary membership.

---

## Subscription

Represents recurring billing state, usually synchronized from Stripe.

Required fields:

| Field | Description |
|---|---|
| `id` | Internal subscription ID |
| `user_id` | Member |
| `plan_id` | Current plan |
| `membership_id` | Linked membership |
| `provider` | stripe, paypal, manual, none |
| `provider_customer_id` | Stripe customer ID |
| `provider_subscription_id` | Stripe subscription ID |
| `status` | incomplete, trialing, active, past_due, unpaid, canceled, paused |
| `current_period_start` | Billing period start |
| `current_period_end` | Billing period end |
| `cancel_at_period_end` | Boolean |
| `canceled_at` | Cancellation timestamp |
| `trial_start` | Optional |
| `trial_end` | Optional |
| `latest_invoice_id` | Optional |
| `created_at` | Created timestamp |
| `updated_at` | Last sync timestamp |

Do not rely only on the local database for billing truth. Stripe webhooks should update this record.

---

## Order

Represents a one-time transaction or initial subscription checkout.

Fields:

| Field | Description |
|---|---|
| `id` | Internal order ID |
| `user_id` | Buyer |
| `order_number` | Human-readable order number |
| `type` | membership, course, add_on, renewal |
| `status` | pending, paid, failed, refunded, partially_refunded, canceled |
| `subtotal` | Amount before discounts/tax |
| `discount_total` | Discount amount |
| `tax_total` | Tax amount |
| `total` | Final amount |
| `currency` | Currency |
| `provider` | stripe, paypal, manual |
| `provider_checkout_session_id` | Stripe checkout session, if applicable |
| `provider_payment_intent_id` | Stripe payment intent, if applicable |
| `provider_invoice_id` | Stripe invoice, if applicable |
| `created_at` | Created timestamp |
| `paid_at` | Payment completed timestamp |
| `refunded_at` | Optional |

---

## Invoice

Represents billing/invoice history shown to members and admins.

Fields:

| Field | Description |
|---|---|
| `id` | Internal invoice ID |
| `user_id` | Member |
| `subscription_id` | Optional |
| `order_id` | Optional |
| `provider_invoice_id` | Stripe invoice ID |
| `number` | Invoice number |
| `status` | draft, open, paid, void, uncollectible |
| `amount_due` | Amount due |
| `amount_paid` | Amount paid |
| `currency` | Currency |
| `hosted_invoice_url` | Provider-hosted invoice link |
| `invoice_pdf_url` | PDF download link |
| `due_date` | Optional |
| `paid_at` | Optional |
| `created_at` | Created timestamp |

Members should be able to see and download invoice history from their account.

---

## AccessRule

Defines what a plan or membership grants access to.

Required fields:

| Field | Description |
|---|---|
| `id` | Rule ID |
| `name` | Internal label |
| `resource_type` | page, course, event, download, category, feature, library, route |
| `resource_id` | Specific resource ID, if applicable |
| `resource_key` | Machine-readable feature key, if applicable |
| `required_plan_ids` | Plans that grant access |
| `required_statuses` | active, trialing, comped, etc. |
| `fallback_behavior` | show_teaser, redirect_to_pricing, show_login, 404 |
| `locked_message` | Message shown to non-members |
| `status` | active, inactive |

Examples:

```text
Active Monthly or Annual members can access /member-dashboard
Active Annual members can access Premium Masterclass Library
Active members can register for member-only events
Course purchasers can access Course A
```

---

## AccessGrant

Represents manual or derived access to a resource.

Fields:

| Field | Description |
|---|---|
| `id` | Access grant ID |
| `user_id` | Member |
| `resource_type` | course, library, feature, event, page |
| `resource_id` | Resource ID |
| `source` | membership, purchase, admin, comp, migration |
| `status` | active, revoked, expired |
| `starts_at` | Optional |
| `expires_at` | Optional |
| `created_by_user_id` | Admin who granted access, if manual |
| `created_at` | Timestamp |

Use this for individual course purchases, admin comps, special promotions, or grandfathered access.

---

## MemberSegment

Segments are saved groups of members based on plan/status/activity.

Examples:

- Active members.
- Trialing members.
- Past-due members.
- Canceled members.
- Annual members.
- Members who purchased Course A.
- Members who have not logged in in 30 days.
- Members who have never completed onboarding.

Fields:

| Field | Description |
|---|---|
| `id` | Segment ID |
| `name` | Segment name |
| `description` | Optional |
| `conditions_json` | Query conditions |
| `is_dynamic` | Dynamic vs static |
| `created_at` | Created timestamp |
| `updated_at` | Updated timestamp |

---

## MemberActivityLog

A timeline of important member events.

Events to log:

- Account created.
- Logged in.
- Membership started.
- Subscription renewed.
- Payment failed.
- Payment recovered.
- Plan upgraded/downgraded.
- Subscription canceled.
- Refund processed.
- Access granted manually.
- Access revoked.
- Email sent.
- Course purchased.
- Course completed.
- Event registered.

Fields:

| Field | Description |
|---|---|
| `id` | Log ID |
| `user_id` | Member |
| `event_type` | Machine-readable event |
| `description` | Human-readable text |
| `metadata_json` | Details |
| `created_by_user_id` | Admin/system user |
| `created_at` | Timestamp |

This timeline is extremely helpful for customer support.

---

# 6. Public/member-facing pages

## Required pages

```text
/pricing
/signup or /checkout
/login
/forgot-password
/member-dashboard
/account
/account/profile
/account/billing
/account/subscription
/account/invoices
/account/notifications
/member-content or /library
/my-courses
/support or /help
```

Optional later:

```text
/member-directory
/community
/referrals
/cancel-survey
/onboarding
```

---

# 7. Public pricing page

## Purpose

Let visitors compare membership plans and start signup.

This is similar to MemberPress Groups/Pricing pages and PMPro Membership Levels pages: display plan options, terms, pricing, and checkout links.

## Layout

```text
Headline
Short explanation of membership value

[Billing toggle: Monthly / Annual, optional]

Plan Card 1
Plan name
Price
Billing interval
Feature bullets
CTA

Plan Card 2
...

FAQ
Guarantee / cancellation note
Login link for existing members
```

## Plan card fields

| Element | Description |
|---|---|
| Plan name | Monthly Member, Annual Member, etc. |
| Price | `$29/mo`, `$290/yr`, etc. |
| Billing terms | Renews monthly, annual, lifetime, free trial |
| Feature bullets | What member gets |
| Featured badge | Optional “Best Value” |
| CTA | Join Now, Start Trial, Subscribe |
| Fine print | Renewal/cancellation note |

## CTA behavior

| User state | CTA behavior |
|---|---|
| Logged out | Goes to checkout/signup |
| Logged in with no membership | Goes to checkout |
| Logged in active member, same plan | Goes to account/dashboard |
| Logged in active member, different plan | Shows upgrade/downgrade flow |
| Plan hidden/invite-only | Requires direct link or code |

---

# 8. Signup / checkout page

## Purpose

Convert a visitor into a member and start billing/access.

## Recommended checkout layout

Desktop two-column:

```text
LEFT COLUMN
Account information
Billing information
Payment information
Terms checkbox

RIGHT COLUMN
Order summary
Plan details
Total due today
Renewal terms
```

Mobile stacks order summary above or below form depending on conversion preference.

## Fields

| Field | Required? |
|---|---:|
| First name | Yes |
| Last name | Yes |
| Email | Yes |
| Password | Yes unless magic-link/account setup email is used |
| Billing country/state | If required for tax |
| Coupon code | Optional |
| Payment method | Required for paid plan |
| Terms checkbox | Yes |
| Marketing opt-in | Optional |

## Checkout states

| State | Behavior |
|---|---|
| Payment succeeds | Create user if needed, create subscription/order, create membership, redirect to success/onboarding |
| Payment fails | Show error and do not grant access |
| Email already exists | Prompt login or continue as existing account |
| Coupon invalid | Show inline error |
| Plan unavailable | Disable checkout |
| Trial plan | Show trial length and first billing date |

## Payment integration rule

Do not mark a membership active only because the user submitted the form. Membership should become active only after payment provider success event or valid free/manual plan creation.

---

# 9. Signup success / onboarding page

## Purpose

Confirm membership and guide the new member to the right first action.

## Layout

```text
Welcome, [First Name]
Your membership is active.

Next steps:
1. Visit your dashboard
2. Start here / orientation content
3. Browse member resources
4. Manage account

[Go to Dashboard]
```

For a Positives-style membership, this page could point to:

- Start Here video.
- Monthly masterclass.
- Daily audio library.
- Weekly reflections.
- My Courses.

---

# 10. Login / forgot password pages

## Login page

Fields:

```text
Email
Password
Remember me
[Log In]
Forgot password?
Create account / View membership options
```

Behavior:

- After login, redirect active members to dashboard.
- If user tried to access locked content, redirect back to original page after login.
- If canceled/free user logs in, show account/dashboard with locked-content upsell where appropriate.

## Forgot password

Flow:

```text
Email → Send reset link → Set new password → Login
```

---

# 11. Member dashboard

## Purpose

The member dashboard is the main home base after login.

It should not be a generic account page. It should answer:

- What do I have access to?
- What should I do next?
- What is new?
- What am I in the middle of?
- Is my membership/billing okay?

## Layout

```text
Welcome back, [First Name]
Membership: Active Monthly Member

[Continue where you left off]

Main cards:
- Start Here / Orientation
- Latest Masterclass
- Daily Audio
- Weekly Reflections
- My Courses
- Upcoming Events
- Member Resources

Sidebar / top card:
- Membership status
- Renewal date
- Billing issue warning, if any
- Manage account link
```

## Dashboard modules

| Module | Purpose |
|---|---|
| Membership status card | Shows plan, status, renewal date |
| Continue learning/content | Resume course or recent content |
| New content | Latest masterclass/audio/reflection |
| Quick links | Courses, library, events, account |
| Billing alert | Past-due or expiring card notice |
| Onboarding reminder | Show until completed/dismissed |

## Status examples

Active:

```text
Your membership is active.
Plan: Monthly Member
Renews on: June 11, 2026
```

Past due:

```text
Your payment could not be processed.
Please update your payment method to keep access active.
[Update Payment Method]
```

Canceled at period end:

```text
Your membership is canceled but remains active until June 30, 2026.
[Reactivate Membership]
```

Expired/canceled:

```text
Your membership is no longer active.
[Reactivate Membership]
```

---

# 12. Account area

## Purpose

Self-service account management.

Use tabs or sidebar navigation.

```text
Account
- Profile
- Membership
- Billing
- Invoices
- Notifications
- Security
```

---

## Account: Profile page

Fields:

| Field | Editable? |
|---|---:|
| First name | Yes |
| Last name | Yes |
| Display name | Yes |
| Email | Yes, with verification recommended |
| Phone | Optional |
| Timezone | Yes |
| Country/state | Optional |
| Password | Separate security flow |

Actions:

- Save profile.
- Change email.
- Change password.
- Delete account request, optional later.

---

## Account: Membership page

Shows current membership and plan options.

Layout:

```text
Current Membership
Plan: Monthly Member
Status: Active
Started: May 1, 2026
Renews: June 1, 2026
Price: $29/month

[Change Plan]
[Cancel Membership]
```

If canceled at period end:

```text
Your membership will end on June 1, 2026.
[Reactivate Membership]
```

If past due:

```text
Payment failed. Please update billing to continue your membership.
[Update Payment Method]
```

---

## Account: Billing page

Billing self-service should either:

1. Use Stripe Customer Portal, or
2. Recreate the minimum equivalent internally.

Recommended V1: use Stripe Customer Portal for billing self-service where possible.

Billing page should include:

- Current payment method summary.
- Update payment method button.
- Billing address.
- Subscription status.
- Cancel/reactivate link.
- Invoice history link.

If using Stripe Customer Portal:

```text
Manage billing, invoices, payment methods, and subscription changes securely through our billing portal.
[Open Billing Portal]
```

Stripe Customer Portal is specifically designed for updating payment methods, managing subscriptions, viewing/downloading invoices, canceling subscriptions, and updating billing information.

---

## Account: Invoices page

Table:

```text
Date | Invoice # | Description | Amount | Status | Download
```

Member can:

- View invoice.
- Download PDF.
- Pay open invoice, if provider supports it.

---

## Account: Notifications page

Fields:

| Setting | Description |
|---|---|
| Product/member emails | Required service emails; cannot fully opt out |
| Marketing emails | Optional opt-in/out |
| Content reminders | Optional |
| Event reminders | Optional |
| SMS reminders | Optional later |

Service emails include billing, password reset, purchase confirmation, renewal reminders, and account security notices.

---

## Account: Security page

V1 fields:

- Change password.
- Active sessions, optional.
- Two-factor authentication, optional later.

---

# 13. Member-only content / resource library

## Purpose

The member management system should enforce access to the protected areas of the platform.

Examples:

- Member dashboard.
- Masterclass archive.
- Daily audio archive.
- Weekly reflections.
- Courses included with membership.
- Member-only events.
- Downloadable resources.

## Locked content behavior

For logged-out visitors:

```text
This content is for members.
Log in or join to continue.
[Log In] [View Membership Options]
```

For logged-in users without access:

```text
Your current account does not include access to this content.
[Upgrade Membership]
```

For past-due members:

```text
Your payment needs attention before you can continue.
[Update Payment Method]
```

For canceled but still active until period end:

- Allow access until `current_period_end`.
- Show subtle reactivation banner.

---

# 14. Admin pages

## Required admin pages

```text
Admin Dashboard
Members
Member Detail
Membership Plans
Subscriptions
Orders / Payments
Invoices
Access Rules
Segments
Coupons / Promotions
Emails / Notifications
Reports
Settings
Imports / Exports
```

---

# 15. Admin dashboard

## Purpose

Quick operational overview.

Cards:

| Card | Metric |
|---|---|
| Active members | Count |
| Trialing members | Count |
| Past-due members | Count |
| Canceled this month | Count |
| New signups | Count |
| MRR / recurring revenue | Amount |
| Failed payments | Count/amount |
| Churn | Percentage |
| Revenue this month | Amount |

Recent activity feed:

```text
- Ryan joined Annual Member
- Jane's payment failed
- Chris canceled Monthly Member
- Alex updated payment method
- Morgan completed checkout
```

---

# 16. Admin Members list

## Purpose

Central member database.

## Layout

```text
Members
[Add Member]
[Import]
[Export]

Search: name, email, phone
Filters: plan, status, segment, joined date, last login, billing state

Table:
[ ] Name | Email | Plan | Status | Renewal Date | Lifetime Value | Last Login | Actions
```

## Columns

| Column | Description |
|---|---|
| Name | First/last/display name |
| Email | Primary email |
| Plan | Current membership plan |
| Status | active, trialing, past_due, canceled, expired |
| Renewal date | Next billing/current period end |
| Source | checkout, admin, import, comp |
| LTV | Lifetime value, optional |
| Last login | Engagement signal |
| Created | Signup date |

## Filters

- Membership plan.
- Membership status.
- Billing status.
- Signup date range.
- Renewal date range.
- Last login date range.
- Marketing opt-in.
- Segment.
- Has course purchase.
- Has billing issue.

## Bulk actions

- Add to segment.
- Export selected.
- Send email, optional later.
- Grant access.
- Revoke access.
- Change plan.
- Cancel membership.
- Delete/anonymize, admin-only and careful.

---

# 17. Admin Member Detail page

## Purpose

This is the support/admin command center for a single member.

## Layout

```text
Member: Ryan Bradshaw
Email: ryan@example.com
Status: Active
Plan: Annual Member

Tabs:
Overview | Membership | Billing | Access | Courses | Events | Activity | Notes
```

## Overview tab

Show:

- Profile details.
- Current plan/status.
- Renewal date.
- Account created date.
- Last login.
- Total revenue/LTV.
- Billing issue alert.
- Quick actions.

Quick actions:

```text
[Impersonate / Login as user, if allowed]
[Send password reset]
[Open billing portal]
[Grant access]
[Change plan]
[Cancel membership]
[Add note]
```

## Membership tab

Show current and historical memberships.

Table:

```text
Plan | Status | Started | Current Period | Canceled | Source | Actions
```

Actions:

- Change plan.
- Cancel now.
- Cancel at period end.
- Reactivate.
- Extend access.
- Convert to comp.
- Revoke.

## Billing tab

Show:

- Stripe customer ID.
- Current subscription.
- Payment method summary.
- Invoices.
- Orders.
- Refunds.
- Failed payment history.

Actions:

- Open provider customer record.
- Open billing portal.
- Resync from Stripe.
- Refund order, if permissions allow.

## Access tab

Show all active access:

```text
Resource | Source | Starts | Expires | Status | Actions
```

Examples:

- Membership dashboard access from Annual Member.
- Course A access from purchase.
- Special workshop access from admin comp.

Actions:

- Grant access.
- Revoke access.
- Extend expiration.

## Activity tab

Timeline of key events.

Example:

```text
May 11, 2026 — Subscription renewed successfully
May 2, 2026 — Logged in
May 1, 2026 — Purchased Course A
Apr 11, 2026 — Joined Monthly Member
```

## Notes tab

Internal notes for support/admin.

Fields:

- Note body.
- Created by.
- Timestamp.
- Pin important note.

---

# 18. Admin Membership Plans page

## Purpose

Create and manage plans.

List table:

```text
Plan | Price | Billing | Members | Status | Visibility | Actions
```

Actions:

- Add plan.
- Edit plan.
- Duplicate plan.
- Archive plan.
- View members.

---

## Admin Plan Editor

Sections:

```text
Basic Info
Pricing & Billing
Access Rules
Pricing Card Display
Checkout Settings
Email Settings
Advanced
```

### Basic Info

- Name.
- Slug.
- Description.
- Status.
- Visibility.

### Pricing & Billing

- Billing type: recurring, one-time, free, manual.
- Price.
- Currency.
- Billing interval.
- Trial days.
- Signup fee.
- Stripe product/price mapping.

### Access Rules

Attach what this plan grants:

- Member dashboard.
- Masterclass library.
- Daily audio.
- Weekly reflections.
- Included courses.
- Member-only events.
- Resource downloads.

### Pricing Card Display

- Plan headline.
- Feature bullets.
- Featured badge.
- CTA label.
- Fine print.

### Checkout Settings

- Required profile fields.
- Terms text.
- Redirect after checkout.
- Confirmation email template.

### Advanced

- Allow upgrades/downgrades.
- Allow cancellation.
- Allow self-service billing portal.
- Max active members, optional.
- Hidden/invite-only logic.

---

# 19. Admin Subscriptions page

## Purpose

Operational view of recurring subscriptions.

Table:

```text
Member | Plan | Status | Amount | Interval | Current Period End | Provider | Actions
```

Filters:

- Active.
- Trialing.
- Past due.
- Canceled.
- Canceling at period end.
- Provider.
- Plan.

Actions:

- View member.
- Open Stripe subscription.
- Cancel.
- Reactivate.
- Resync.

Important statuses:

| Status | Meaning |
|---|---|
| `incomplete` | Created but first payment not completed |
| `trialing` | Trial active |
| `active` | Paid/valid subscription |
| `past_due` | Payment failed or action required |
| `unpaid` | Payment failure unresolved; access policy needed |
| `canceled` | Subscription canceled |
| `paused` | Optional, if supported |

Access policy should define which statuses still have access.

Recommended V1:

| Subscription status | Access behavior |
|---|---|
| active | allow access |
| trialing | allow access |
| past_due | allow temporary grace access, show warning |
| unpaid | block access or require payment update |
| canceled before period end | allow until current period end |
| canceled after period end | block access |
| incomplete | block access |

---

# 20. Admin Orders / Payments page

## Purpose

View transactions.

Table:

```text
Order # | Member | Type | Plan/Product | Amount | Status | Date | Provider | Actions
```

Filters:

- Paid.
- Failed.
- Refunded.
- Membership orders.
- Course purchases.
- Date range.

Actions:

- View order.
- View member.
- Refund, if allowed.
- Resend receipt.
- Open provider payment.

---

# 21. Admin Invoices page

## Purpose

View recurring billing invoices.

Table:

```text
Invoice # | Member | Amount | Status | Due/Paid Date | Subscription | Download | Actions
```

Actions:

- View hosted invoice.
- Download PDF.
- Mark paid manually, only if manual provider.
- Resync from provider.

---

# 22. Admin Access Rules page

## Purpose

Manage what each plan/status can access.

List table:

```text
Rule Name | Resource | Required Plans | Required Statuses | Fallback | Status
```

Rule editor:

```text
Rule name
Resource type
Resource selection
Required plans
Required statuses
Fallback behavior
Locked message
Status
```

Fallback options:

| Fallback | Use case |
|---|---|
| Show teaser | Marketing pages/content previews |
| Redirect to pricing | Member-only content |
| Show login/join box | Content detail pages |
| 404 | Private/internal areas |

Required access functions:

```text
canUserAccessResource(userId, resourceType, resourceId)
canUserAccessFeature(userId, featureKey)
getUserEntitlements(userId)
```

Do not hardcode access checks in random UI components.

---

# 23. Admin Segments page

## Purpose

Create member groups for reporting, communication, and access targeting.

Examples:

- Active annual members.
- Past-due members.
- Trial members ending in 3 days.
- Canceled in last 30 days.
- Has not logged in for 30 days.
- Purchased specific course.
- Has billing issue.

Segment editor:

```text
Segment name
Conditions
Preview member count
Save segment
```

Conditions:

- Plan is X.
- Status is active/past_due/canceled.
- Signup date before/after.
- Last login before/after.
- Has purchased course.
- Has access grant.
- Email opt-in true/false.

---

# 24. Admin Coupons / Promotions page

## Purpose

Support basic discounts for membership signup.

Fields:

| Field | Description |
|---|---|
| `code` | Coupon code |
| `discount_type` | percent or fixed |
| `amount` | Discount value |
| `applies_to_plan_ids` | Eligible plans |
| `duration` | once, forever, repeating months |
| `max_redemptions` | Optional |
| `redeem_by` | Expiration |
| `status` | active/inactive |

V1 can use Stripe coupons/promotion codes if Stripe Checkout is the billing provider. Store local references for display and reporting.

---

# 25. Admin Emails / Notifications page

## Purpose

Configure lifecycle emails.

Required emails:

| Email | Trigger |
|---|---|
| Welcome email | New member signup |
| Payment receipt | Successful payment |
| Subscription renewed | Renewal payment succeeds, optional |
| Payment failed | Renewal payment fails |
| Payment recovery | Failed payment later succeeds |
| Trial ending | Trial ending soon |
| Renewal reminder | Before annual renewal, optional |
| Cancellation confirmation | Member cancels |
| Membership expired | Access ends |
| Manual access granted | Admin grants access |
| Password reset | User requests reset |

Email editor:

- Subject.
- Preview text.
- Body.
- Variables.
- Enabled/disabled.
- Send test.

Common variables:

```text
{{first_name}}
{{plan_name}}
{{renewal_date}}
{{billing_portal_url}}
{{dashboard_url}}
{{support_email}}
```

Important: billing-critical emails should still send even if the user opts out of marketing emails.

---

# 26. Admin Reports page

## Purpose

Basic operational and revenue reporting.

V1 reports:

| Report | Metrics |
|---|---|
| Members by plan | Active count per plan |
| Members by status | Active, trialing, past_due, canceled |
| Revenue | MRR, ARR, monthly revenue, refunds |
| Signups/cancellations | New members, canceled members |
| Churn | Canceled / active base |
| Failed payments | Count and amount |
| Engagement | Last login, content activity, dashboard visits |

Paid Memberships Pro includes core reports for sales/revenue, signups/cancellations, active members by level, visits/views/logins. That is a good V1 reporting model.

---

# 27. Admin Settings page

## Settings sections

```text
General
Billing
Access
Account
Emails
Integrations
Data / Privacy
```

## General

- Default dashboard page.
- Pricing page.
- Login page.
- Account page.
- Support email.
- Brand name.

## Billing

- Payment provider.
- Stripe API/webhook status.
- Default currency.
- Grace period for failed payments.
- Cancellation behavior.
- Refund access behavior.
- Customer portal enabled.

## Access

- Access during trial.
- Access during past_due.
- Access after cancellation until period end.
- Default locked-content message.
- Redirect destination for locked content.

## Account

- Allow members to update profile.
- Allow members to cancel.
- Allow plan changes.
- Require email verification.
- Password rules.

## Emails

- Sender name.
- Sender email.
- Email footer.
- Email template styling.

## Integrations

- Stripe.
- Email marketing platform.
- CRM, optional.
- Webhooks/Zapier/Make.

## Data / Privacy

- Export member data.
- Delete/anonymize account.
- Consent tracking.
- Data retention policy.

---

# 28. Subscription lifecycle flows

## New paid signup

```text
Visitor selects plan
→ Checkout session starts
→ User enters account + payment details
→ Payment succeeds
→ User created/updated
→ Order created as paid
→ Subscription created/synced
→ Membership created as active/trialing
→ Access grants created
→ Welcome email sent
→ Redirect to dashboard/onboarding
```

## Renewal payment succeeds

```text
Stripe invoice.paid webhook
→ Find subscription/member
→ Update subscription current period
→ Ensure membership active
→ Log activity
→ Send receipt/renewal email if enabled
```

## Renewal payment fails

```text
Stripe invoice.payment_failed webhook
→ Mark subscription past_due
→ Membership status past_due or grace
→ Log activity
→ Send payment failed email
→ Show dashboard billing warning
→ Optionally keep access during grace period
```

## Payment recovery

```text
Invoice paid after failure
→ Set subscription active
→ Restore membership access
→ Clear billing warning
→ Log payment recovered
→ Send recovery confirmation, optional
```

## Member cancels

```text
Member clicks cancel
→ Confirm cancellation
→ Cancel at period end by default
→ Set cancel_at_period_end = true
→ Keep access until period end
→ Send cancellation confirmation
→ Show reactivation option
```

## Cancellation period ends

```text
Subscription becomes canceled
→ Membership status canceled/expired
→ Revoke membership-derived access
→ Keep user account active
→ Show rejoin/reactivate CTA
```

## Admin grants comp membership

```text
Admin selects user + plan + duration
→ Create membership with source=admin/comp
→ Create access grants
→ Optionally send email
→ Log activity
```

## Refund

```text
Admin/provider refunds order
→ Update order status refunded
→ If refund policy = revoke access, cancel/revoke related membership/access
→ Log activity
→ Send refund/access email if enabled
```

---

# 29. Member statuses

Use clear statuses. Avoid vague labels.

| Status | Meaning | Access? |
|---|---|---|
| `free` | Account exists but no paid membership | Limited/free only |
| `trialing` | Trial is active | Yes |
| `active` | Paid/current/valid | Yes |
| `past_due` | Payment failed but still recoverable | Maybe, based on grace policy |
| `unpaid` | Payment unresolved after retries | Usually no |
| `canceled_pending_end` | Canceled but paid period remains | Yes until period end |
| `canceled` | Subscription canceled and period ended | No paid access |
| `expired` | Fixed-term access ended | No paid access |
| `comped` | Admin-granted access | Yes until expiration/revoke |
| `revoked` | Admin removed access | No |

---

# 30. Access control rules

Centralize all access logic.

Required functions:

```text
canUserAccessResource(userId, resourceType, resourceId)
canUserAccessFeature(userId, featureKey)
getUserMembershipStatus(userId)
getUserActivePlans(userId)
getUserEntitlements(userId)
```

Example logic:

```text
A user can access a protected resource if:
- user is admin, OR
- user has active AccessGrant for the resource, OR
- user has active/trialing/comped Membership whose plan matches an AccessRule, OR
- resource is public/free.
```

Do not allow access based only on role name or UI visibility. Enforce it at route/API level.

---

# 31. Member self-service plan changes

## Upgrade

Example: Monthly → Annual.

Recommended behavior:

- Show confirmation screen.
- Explain new price and billing date.
- Let Stripe handle proration if using Stripe Billing, or define custom policy.
- Update membership/plan after successful provider update.

## Downgrade

Example: Annual Premium → Basic.

Recommended behavior:

- Schedule downgrade at period end by default.
- Avoid immediately removing access the member already paid for unless business rules require it.

## Cancel

Recommended V1:

- Cancel at period end by default.
- Ask optional cancellation reason.
- Offer “pause” or “discount” later, not V1 unless easy.

---

# 32. Member communications and lifecycle automation

## Key lifecycle moments

- New signup.
- First login.
- Onboarding not completed.
- Trial ending.
- Payment failed.
- Payment recovered.
- Plan changed.
- Member canceled.
- Member approaching renewal.
- Member inactive for 30 days.
- New content available.

## V1 emails to implement

1. Welcome / membership active.
2. Payment receipt.
3. Payment failed.
4. Subscription canceled.
5. Membership expired.
6. Password reset.
7. Manual access granted.

## V2 emails

1. Trial ending.
2. Renewal reminder.
3. Inactive member reminder.
4. New content announcement.
5. Cancellation winback.
6. Failed onboarding reminder.

---

# 33. Privacy, permissions, and security

## Member privacy

Members should be able to:

- View profile data.
- Update profile data.
- Change password.
- Manage email preferences.
- View invoices.
- Request account deletion/export, optional depending on legal needs.

## Admin permissions

Do not give all admin users unrestricted billing/member control.

Recommended permissions:

| Permission | Allows |
|---|---|
| `view_members` | View member list/detail |
| `edit_members` | Edit profile/status |
| `manage_memberships` | Change plans/grant/revoke access |
| `manage_billing` | View/refund/cancel payments |
| `export_members` | Export CSV/member data |
| `manage_plans` | Create/edit plans |
| `manage_access_rules` | Configure access rules |
| `manage_emails` | Edit lifecycle emails |
| `view_reports` | See revenue/membership reports |
| `impersonate_users` | Login as member, if enabled |

## Security requirements

- Verify webhook signatures.
- Make webhook processing idempotent.
- Never store raw credit card details.
- Use payment provider tokens/IDs only.
- Enforce access server-side/API-side, not just in UI.
- Log all billing/admin changes.
- Protect admin actions with permissions.
- Require confirmation for destructive changes.
- Rate-limit login and password reset.
- Use email verification for email changes.

---

# 34. Integrations

## Stripe integration

Use Stripe for:

- Checkout.
- Subscriptions.
- Invoices.
- Payment methods.
- Customer portal.
- Webhooks.
- Coupons/promotion codes, if desired.

Recommended Stripe events to handle:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
invoice.payment_action_required
charge.refunded
customer.updated
```

Webhook behavior must be idempotent.

## Email platform / CRM integration

V1 can be simple:

- Send member created.
- Send membership active/canceled/past_due.
- Sync plan/status tags.
- Sync email opt-in.

Example tags:

```text
member-active
member-past-due
member-canceled
plan-monthly
plan-annual
course-customer
```

## Internal modules

Member management should connect to:

- Courses: membership can include course access.
- Events: member plans can unlock member pricing or member-only events.
- Content library: access rules control protected content.
- Email system: lifecycle triggers.
- Reporting dashboard.

---

# 35. Recommended URLs

Public/member-facing:

```text
/pricing
/checkout?plan={plan_slug}
/signup
/login
/forgot-password
/member-dashboard
/account
/account/profile
/account/membership
/account/billing
/account/invoices
/account/notifications
/member-content
/my-courses
```

Admin:

```text
/admin/members
/admin/members/{user_id}
/admin/plans
/admin/plans/{plan_id}
/admin/subscriptions
/admin/orders
/admin/invoices
/admin/access-rules
/admin/segments
/admin/coupons
/admin/emails
/admin/reports
/admin/settings/membership
```

API examples:

```text
GET    /api/me
GET    /api/me/membership
PATCH  /api/me/profile
POST   /api/checkout/session
POST   /api/billing/portal
POST   /api/membership/cancel
POST   /api/membership/reactivate
GET    /api/admin/members
GET    /api/admin/members/{id}
POST   /api/admin/members/{id}/grant-access
POST   /api/admin/members/{id}/revoke-access
POST   /api/webhooks/stripe
```

---

# 36. Page design summary

## Pricing page

Goal: sell the membership.

Must include:

- Plan cards.
- Price/interval.
- Feature bullets.
- CTA per plan.
- Monthly/annual toggle if needed.
- FAQ.
- Login link.

## Checkout page

Goal: create paid member.

Must include:

- Account fields.
- Payment flow.
- Order summary.
- Coupon field.
- Terms checkbox.
- Clear renewal language.

## Member dashboard

Goal: help member use the product.

Must include:

- Membership status.
- Recommended next action.
- Latest content.
- Courses/resources/events shortcuts.
- Billing warning if needed.

## Account pages

Goal: let member self-manage.

Must include:

- Profile.
- Membership status.
- Billing portal/payment method.
- Invoice history.
- Email preferences.
- Password/security.

## Admin member list

Goal: find and manage members.

Must include:

- Search.
- Filters.
- Plan/status columns.
- Renewal date.
- Last login.
- Bulk actions.

## Admin member detail

Goal: support/debug one member.

Must include:

- Profile overview.
- Membership/subscription state.
- Billing history.
- Access grants.
- Activity timeline.
- Notes.
- Admin actions.

## Plan editor

Goal: configure products/access.

Must include:

- Plan name/status/visibility.
- Billing details.
- Stripe mapping.
- Feature bullets.
- Access rules.
- Checkout settings.

## Access rules

Goal: protect content/features.

Must include:

- Resource type/ID.
- Required plans/statuses.
- Fallback behavior.
- Locked message.

## Reports

Goal: understand member business health.

Must include:

- Active members.
- Members by plan/status.
- MRR/revenue.
- Signups/cancellations.
- Failed payments.
- Churn.

---

# 37. MVP build order

## Phase 1: Core member records

1. User + MemberProfile.
2. MembershipPlan.
3. Membership.
4. AccessRule.
5. AccessGrant.
6. Basic admin member list/detail.

## Phase 2: Public signup and account

1. Pricing page.
2. Signup/checkout shell.
3. Login/forgot password.
4. Member dashboard.
5. Account profile page.
6. Account membership page.

## Phase 3: Billing integration

1. Stripe products/prices mapping.
2. Stripe Checkout.
3. Stripe webhooks.
4. Subscription sync.
5. Order/invoice records.
6. Stripe Customer Portal button.
7. Billing/invoice pages.

## Phase 4: Access control

1. Central access functions.
2. Protected resource middleware.
3. Locked content messages.
4. Plan-to-resource rules.
5. Manual access grants.
6. Membership access for courses/content/events.

## Phase 5: Admin operations

1. Plan editor.
2. Subscription list.
3. Orders/payments list.
4. Access rules manager.
5. Segments.
6. Member activity timeline.
7. Internal notes.

## Phase 6: Emails and reports

1. Welcome email.
2. Payment failed email.
3. Cancellation email.
4. Manual access email.
5. Reports dashboard.
6. Exports.

---

# 38. Acceptance criteria

## Public/signup

1. Visitor can view pricing page.
2. Visitor can select a membership plan.
3. Visitor can complete checkout.
4. Existing user can log in during checkout instead of creating duplicate account.
5. Successful payment creates user, order, subscription, membership, and access.
6. Failed payment does not create active membership access.
7. Member is redirected to dashboard after successful signup.
8. Welcome email is sent after successful signup.

## Member account

1. Member can log in.
2. Member can view dashboard.
3. Member can see current plan/status/renewal date.
4. Member can update profile.
5. Member can open billing portal or manage billing.
6. Member can view invoice history.
7. Member can cancel membership if cancellation is enabled.
8. Member with canceled-at-period-end status keeps access until period end.
9. Past-due member sees billing warning.

## Access control

1. Active members can access member-only dashboard/content.
2. Logged-out visitors see login/join prompt on locked content.
3. Logged-in users without access see upgrade prompt.
4. Past-due access follows configured grace policy.
5. Canceled/expired members lose protected access after period end.
6. Admin users can bypass access rules for testing/management.
7. Access is enforced server-side, not only hidden in UI.

## Admin members

1. Admin can search members by name/email.
2. Admin can filter by plan/status.
3. Admin can view member detail.
4. Admin can see member subscriptions/orders/invoices/access/activity.
5. Admin can manually grant access.
6. Admin can revoke access.
7. Admin can change/cancel/reactivate membership if permission allows.
8. Admin can add internal notes.
9. Admin can export members if permission allows.

## Billing/subscriptions

1. Stripe checkout creates correct records.
2. Stripe webhooks update subscription status.
3. Duplicate webhook does not duplicate membership/order/access records.
4. Renewal payment extends membership period.
5. Failed payment updates status to past_due and triggers email.
6. Payment recovery restores active access.
7. Cancellation updates membership correctly.
8. Refund applies configured access behavior.

## Plans/access rules

1. Admin can create/edit/archive plans.
2. Admin can map plan to Stripe product/price.
3. Admin can create access rules for content/features/courses/events.
4. Pricing page shows active public plans only.
5. Hidden/internal plans do not appear publicly.
6. Plan changes update member access.

## Emails/reports

1. Welcome email sends on signup.
2. Payment failed email sends on failed renewal.
3. Cancellation email sends on cancellation.
4. Admin can see active members by plan.
5. Admin can see members by status.
6. Admin can see revenue/signups/cancellations at a basic level.

---

# 39. Common mistakes to avoid

## Mistake 1: Treating membership as a role only

Bad:

```text
user.role = member
```

Good:

```text
User has Membership with plan/status/current_period_end
Access is derived from membership + access rules + grants
```

## Mistake 2: Hardcoding access inside pages

Bad:

```text
if user.plan == 'monthly' show content
```

Good:

```text
canUserAccessResource(userId, resourceType, resourceId)
```

## Mistake 3: Ignoring subscription states

A subscription is not just active/canceled. You need to handle trialing, past_due, unpaid, cancel_at_period_end, incomplete, and expired states.

## Mistake 4: Granting access before payment is confirmed

Do not grant paid access until checkout/payment is confirmed by provider or webhook.

## Mistake 5: Deleting canceled members

Do not delete canceled members automatically. Keep their account, invoices, purchases, and history.

## Mistake 6: No member self-service

Members should be able to update billing, view invoices, cancel/reactivate if allowed, and update profile without contacting support.

## Mistake 7: No admin timeline

Support needs to know what happened: signup, payment failure, cancellation, access grants, refunds, emails.

## Mistake 8: No webhook idempotency

Stripe may send events more than once. Processing must be safe to repeat.

## Mistake 9: Confusing plan features with access rules

Feature bullets on a pricing page are marketing copy. Access rules are enforcement logic. Keep them separate.

## Mistake 10: Building too much association software

Do not overbuild chapters, committees, board management, complex directories, or association-specific workflows unless needed later.

---

# 40. Copy/paste prompt for IDE agent

```text
Build a member management system for our paid membership platform.

This is not just user login. It must manage membership plans, subscriptions, access rules, member account self-service, admin member management, billing state, and lifecycle emails.

Reference systems: MemberPress, Paid Memberships Pro, WooCommerce Memberships, WildApricot, Memberful, and Stripe Customer Portal.

Core user flow:
Pricing Page → Signup/Checkout → Payment Success → Account Created → Membership Created → Access Granted → Member Dashboard → Account/Billing Self-Service

Required entities:
- User
- MemberProfile
- MembershipPlan
- PlanFeature
- Membership
- Subscription
- Order
- Invoice
- AccessRule
- AccessGrant
- MemberSegment
- MemberActivityLog
- MemberNote
- EmailPreference
- LifecycleEmail
- Coupon/PromotionCode

Do not model membership as only a user role. A member should have a Membership record with plan, status, source, current_period_start, current_period_end, cancel_at_period_end, canceled_at, subscription_id, order_id, created_at, updated_at.

Required public/member pages:
1. Pricing page
   - Plan cards with plan name, price, interval, feature bullets, CTA, featured badge, fine print, FAQ.
   - CTA changes based on logged-in/member state.

2. Checkout/signup page
   - Account fields, billing/payment flow, order summary, coupon, terms checkbox.
   - Successful payment creates user/order/subscription/membership/access.
   - Failed payment does not grant active access.
   - Existing users can log in during checkout.

3. Login and forgot password pages
   - Redirect active members to dashboard.
   - Redirect users back to locked content after login when appropriate.

4. Signup success/onboarding page
   - Welcome message, membership active confirmation, next steps, dashboard CTA.

5. Member dashboard
   - Membership status card showing plan/status/renewal date.
   - Continue/recommended content.
   - Latest content cards.
   - Quick links to courses, library, events, account.
   - Billing warning if past_due.

6. Account area
   - Profile tab: name, email, phone, timezone, password/security.
   - Membership tab: current plan, status, start date, renewal/current period end, change/cancel/reactivate.
   - Billing tab: payment method summary, billing portal button, billing address.
   - Invoices tab: invoice date/number/status/amount/download.
   - Notifications tab: marketing/content/event preferences.

7. Locked content states
   - Logged out: show login/join prompt.
   - Logged in without access: show upgrade prompt.
   - Past_due: show update payment prompt based on grace policy.
   - Canceled at period end: allow until current period end.

Required admin pages:
1. Admin dashboard
   - Active members, trialing, past_due, canceled, new signups, MRR/revenue, failed payments, churn.
   - Recent activity feed.

2. Members list
   - Search by name/email/phone.
   - Filters: plan, status, segment, joined date, last login, renewal date, billing issue.
   - Columns: name, email, plan, status, renewal date, source, LTV, last login, created.
   - Bulk actions: export, grant access, revoke access, change plan, cancel membership.

3. Member detail
   - Tabs: Overview, Membership, Billing, Access, Courses, Events, Activity, Notes.
   - Quick actions: send password reset, open billing portal/provider customer, grant access, change plan, cancel/reactivate, add note.
   - Activity timeline logs signup, login, payments, failures, cancellations, access grants, emails.

4. Membership Plans
   - Plan list and plan editor.
   - Plan editor sections: Basic Info, Pricing & Billing, Access Rules, Pricing Card Display, Checkout Settings, Email Settings, Advanced.
   - Support public, hidden, invite-only, internal plans.
   - Map plan to Stripe product/price.

5. Subscriptions
   - View recurring subscriptions with member, plan, status, amount, interval, current period end, provider.
   - Handle statuses: incomplete, trialing, active, past_due, unpaid, canceled, paused.

6. Orders/Payments
   - View orders and transactions.
   - Actions: view member, refund, resend receipt, open provider payment.

7. Invoices
   - View invoice history with amount/status/provider PDF/download URL.

8. Access Rules
   - Create rules for resource_type/resource_id/feature_key.
   - Required plans/statuses.
   - Fallback: teaser, redirect_to_pricing, login/join box, 404.

9. Segments
   - Dynamic segments by plan, status, signup date, last login, purchase/access, email opt-in.

10. Coupons/Promotions
   - Code, type, amount, plans, duration, max redemptions, expiration, status.

11. Emails/Notifications
   - Welcome, receipt, payment failed, payment recovered, trial ending, renewal reminder, cancellation, expired, manual access, password reset.
   - Subject/body/variables/enabled/send test.

12. Reports
   - Members by plan/status, revenue/MRR, signups/cancellations, churn, failed payments, engagement.

Required access functions:
- canUserAccessResource(userId, resourceType, resourceId)
- canUserAccessFeature(userId, featureKey)
- getUserMembershipStatus(userId)
- getUserActivePlans(userId)
- getUserEntitlements(userId)

Access policy:
- active/trialing/comped = allow access.
- past_due = allow temporary grace access if configured; otherwise block with payment prompt.
- canceled_at_period_end = allow until current_period_end.
- canceled/expired/unpaid/incomplete = block paid access.
- admin users can bypass access rules.
- enforce access server-side/API-side, not only in UI.

Stripe integration:
- Use Stripe Checkout for signup where appropriate.
- Use Stripe Customer Portal for billing self-service where possible.
- Store Stripe customer/subscription/invoice IDs.
- Handle webhooks:
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.paid
  - invoice.payment_failed
  - invoice.payment_action_required
  - charge.refunded
- Webhook processing must be idempotent.
- Never store raw card data.

Subscription flows:
- New paid signup creates user, order, subscription, membership, access grants, welcome email.
- Renewal payment updates current period and keeps access active.
- Payment failure marks past_due, sends email, shows billing warning.
- Payment recovery restores active access.
- Cancellation defaults to cancel at period end and access remains until then.
- Refund follows setting: revoke access or keep access.
- Admin comp creates membership/access without billing.

Security/permissions:
- Separate permissions for view_members, edit_members, manage_memberships, manage_billing, export_members, manage_plans, manage_access_rules, manage_emails, view_reports, impersonate_users.
- Verify webhook signatures.
- Rate-limit login/password reset.
- Log billing/admin changes.
- Require confirmation for destructive changes.
- Email changes should require verification.

MVP build order:
1. Core member records: User, MemberProfile, MembershipPlan, Membership, AccessRule, AccessGrant.
2. Public pricing/signup/account pages.
3. Stripe checkout, webhooks, subscriptions, orders, invoices, customer portal.
4. Central access control and locked-content states.
5. Admin members, member detail, plans, subscriptions, orders, access rules.
6. Lifecycle emails and reports.

Acceptance tests:
- Visitor can view pricing, choose a plan, and check out.
- Successful payment creates account, subscription, membership, and access.
- Failed payment does not grant access.
- Existing user can buy without duplicate account.
- Active member can view dashboard and protected content.
- Logged-out user sees login/join prompt on locked content.
- Logged-in user without access sees upgrade prompt.
- Past-due member sees billing warning and access follows configured grace policy.
- Canceled-at-period-end member keeps access until period end.
- Expired/canceled member loses protected access.
- Member can update profile, view invoices, and open billing portal.
- Admin can search/filter members, view member detail, grant/revoke access, change/cancel/reactivate membership.
- Stripe webhooks update statuses and are idempotent.
- Reports show active members by plan/status and basic revenue/signups/cancellations.
```

---

# 41. Final positioning

The cleanest way to describe this system is:

> Build a member management layer that connects plans, subscriptions, access rules, member self-service, admin operations, billing state, and lifecycle emails. It should be simpler than association management software, but more complete than basic login or role-based access.

The most important architectural rule:

> Membership is not a role. Membership is a billing/access relationship with status, period dates, plan, entitlements, and lifecycle events.

