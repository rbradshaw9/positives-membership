# Beta Invitation Template

Subject: You’re invited to the Positives beta

Hi [First Name],

I’d love to invite you into the private beta for Positives.

This beta is a chance to experience the real product early and help us shape the final experience before a broader launch. We’re looking for thoughtful, honest feedback on what feels smooth, what feels confusing, and anything that seems broken or incomplete.

### What to expect

- real product access
- early content, with more being added
- occasional rough edges while we refine
- a simple in-app way to send feedback, screenshots, and Loom videos

### What we’d love from you

- use the platform naturally
- try Today, My Practice, the Library, and account/billing flows
- tell us what feels great, awkward, unclear, or slow

### Beta access details

- Start date: [date]
- Access plan: [comped / discounted / grandfathered beta rate]
- Notes: [anything important about pricing or access]

If you’d like to join, reply here or use this link:

[Beta invitation link]

### Recommended invite link patterns

- Free alpha:
  - `/beta?cohort=alpha&offer=free&code=alpha-wave-1`
- Paid billing-test alpha:
  - `/beta?cohort=alpha&offer=paid-test&code=alpha-billing`
- Discounted private beta:
  - `/beta?cohort=beta&offer=discount&code=beta-wave-1`

These links let Positives persist:

- `launch_cohort`
- `launch_source`
- `launch_campaign_code`

on the member record and in Stripe metadata, so we can filter alpha vs beta vs
live users later without guesswork.

We’d be genuinely grateful to have your eyes on it.

Ryan

---

## Internal Notes

- personalize lightly
- keep the ask warm and simple
- do not over-explain the whole product
- if offering a special beta rate, state it clearly
- if using free or discounted invites, create the Stripe promotion code first
