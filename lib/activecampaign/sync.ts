/**
 * lib/activecampaign/sync.ts
 *
 * Business logic for syncing Positives member state into ActiveCampaign.
 *
 * All functions are non-fatal — errors are logged but never thrown,
 * so AC issues never block Stripe webhook acknowledgment.
 *
 * Tag IDs (created 2026-04-07):
 *   level_1         → 1
 *   level_2         → 2
 *   level_3         → 3
 *   level_4         → 4
 *   past_due        → 5
 *   canceled        → 6
 *   founding_member → 7
 *   onboarding_complete → 8
 *
 * List IDs:
 *   Positives Members → 3
 */

import { ac, acIsConfigured } from "./client";
import type { Enums } from "@/types/supabase";

type SubscriptionTier = Enums<"subscription_tier">;

// ─── Constants ────────────────────────────────────────────────────────────────

const LIST_ID = 3;

const TIER_TAG: Record<SubscriptionTier, number> = {
  level_1: 1,
  level_2: 2,
  level_3: 3,
  level_4: 4,
};

const TAG = {
  past_due:            5,
  canceled:            6,
  founding_member:     7,
  onboarding_complete: 8,
  affiliate:           9,
} as const;

/** Custom field IDs (created 2026-04-07) */
const FIELD = {
  membershipTier:    2,
  memberSince:       3,
  stripeCustomerId:  4,
  affiliateLink:     5,  // previously rewardfulLink
  affiliateToken:    6,  // previously rewardfulToken
  affiliatePortal:   7,  // previously rewardfulPortal
  billingLink:       9, // Signed billing recovery URL for payment-failed emails
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactSyncPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type ContactSyncResponse = {
  contact: { id: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Upsert a contact in AC. Returns the AC contact ID. */
async function syncContact(payload: ContactSyncPayload): Promise<string> {
  const res = await ac.post<ContactSyncResponse>("/contact/sync", {
    contact: {
      email:     payload.email,
      firstName: payload.firstName ?? "",
      lastName:  payload.lastName ?? "",
      ...(payload.phone ? { phone: payload.phone } : {}),
    },
  });
  return res.contact.id;
}

/** Subscribe a contact to the Positives Members list. */
async function subscribeToList(contactId: string): Promise<void> {
  await ac.post("/contactLists", {
    contactList: {
      list:    LIST_ID,
      contact: contactId,
      status:  1, // 1 = active/subscribed
    },
  });
}

/** Add a tag to a contact by tag ID. */
async function addTag(contactId: string, tagId: number): Promise<void> {
  await ac.post("/contactTags", {
    contactTag: { contact: contactId, tag: tagId },
  });
}

/** Remove a tag from a contact (fetches contactTags first to find the record ID). */
async function removeTagIfPresent(contactId: string, tagId: number): Promise<void> {
  type TagList = { contactTags: Array<{ id: string; tag: string }> };
  const res = await ac.get<TagList>(`/contacts/${contactId}/contactTags`);
  const record = res.contactTags.find((t) => t.tag === String(tagId));
  if (record) {
    await ac.delete(`/contactTags/${record.id}`);
  }
}

/** Set (create or overwrite) a custom field value on a contact. */
async function setFieldValue(contactId: string, fieldId: number, value: string): Promise<void> {
  await ac.post("/fieldValues", {
    fieldValue: { contact: contactId, field: fieldId, value },
  });
}

// ─── Public sync functions ────────────────────────────────────────────────────

/**
 * Called on checkout.session.completed.
 * Creates/updates the contact in AC, subscribes them to the list,
 * applies their tier tag, and applies founding_member.
 */
export async function syncNewMember(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tier: SubscriptionTier;
  stripeCustomerId?: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({
      email:     params.email,
      firstName: params.firstName,
      lastName:  params.lastName,
      phone:     params.phone,
    });

    await subscribeToList(contactId);
    await addTag(contactId, TIER_TAG[params.tier]);
    await addTag(contactId, TAG.founding_member);

    // Write searchable custom fields
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    await setFieldValue(contactId, FIELD.membershipTier, params.tier);
    await setFieldValue(contactId, FIELD.memberSince, today);
    if (params.stripeCustomerId) {
      await setFieldValue(contactId, FIELD.stripeCustomerId, params.stripeCustomerId);
    }

    console.log(`[AC] New member synced — ${params.email}, tier: ${params.tier}, id: ${contactId}`);
  } catch (err) {
    console.error("[AC] syncNewMember failed (non-fatal):", err);
  }
}

/**
 * Called on customer.subscription.updated.
 * Removes the old tier tag and applies the new one.
 */
export async function syncTierChange(params: {
  email: string;
  oldTier: SubscriptionTier | null;
  newTier: SubscriptionTier;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    if (params.oldTier && params.oldTier !== params.newTier) {
      await removeTagIfPresent(contactId, TIER_TAG[params.oldTier]);
    }

    await addTag(contactId, TIER_TAG[params.newTier]);
    // Ensure they're re-subscribed in case they were previously unsubscribed
    await subscribeToList(contactId);

    console.log(`[AC] Tier updated — ${params.email}: ${params.oldTier ?? "?"} → ${params.newTier}`);
  } catch (err) {
    console.error("[AC] syncTierChange failed (non-fatal):", err);
  }
}

/**
 * Called on customer.subscription.deleted.
 * Applies the canceled tag and removes tier tags.
 */
export async function syncCancellation(params: { email: string; tier: SubscriptionTier | null }): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    if (params.tier) {
      await removeTagIfPresent(contactId, TIER_TAG[params.tier]);
    }

    await addTag(contactId, TAG.canceled);

    console.log(`[AC] Cancellation synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncCancellation failed (non-fatal):", err);
  }
}

/**
 * Called on invoice.payment_failed.
 * Sets BILLING_LINK field (signed 7-day token URL) then applies past_due tag.
 * The billing link is used as the CTA button in the Past Due Recovery emails,
 * allowing 1-click access to the Stripe billing portal without requiring login.
 */
export async function syncPaymentFailed(params: {
  email: string;
  billingLink?: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    // Set the billing link field before applying the tag so the
    // merge tag resolves correctly when the automation email fires.
    if (params.billingLink) {
      await setFieldValue(contactId, FIELD.billingLink, params.billingLink);
    }

    await addTag(contactId, TAG.past_due);

    console.log(`[AC] Payment failed synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncPaymentFailed failed (non-fatal):", err);
  }
}

/**
 * Called on invoice.payment_succeeded (renewal).
 * Removes past_due tag if present (they've caught up).
 */
export async function syncPaymentRecovered(params: { email: string }): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });
    await removeTagIfPresent(contactId, TAG.past_due);

    console.log(`[AC] Payment recovered — past_due tag removed for ${params.email}`);
  } catch (err) {
    console.error("[AC] syncPaymentRecovered failed (non-fatal):", err);
  }
}

/**
 * Called after the Day 14 onboarding drip email is sent successfully.
 * Applies the onboarding_complete tag, which triggers the L1 → L2
 * upsell automation in ActiveCampaign.
 */
export async function syncOnboardingComplete(params: { email: string }): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });
    await addTag(contactId, TAG.onboarding_complete);

    console.log(`[AC] Onboarding complete — tag applied for ${params.email}`);
  } catch (err) {
    console.error("[AC] syncOnboardingComplete failed (non-fatal):", err);
  }
}

/**
 * Called when a member is enrolled in the affiliate program.
 * Applies the affiliate tag (triggers the welcome email automation in AC)
 * and populates affiliate custom fields for use in email templates.
 *
 * @param params.email          Member's email address
 * @param params.referralToken  Affiliate referral tracking code / slug
 * @param params.affiliateId    Affiliate program ID
 */
export async function syncAffiliate(params: {
  email: string;
  referralToken: string;
  affiliateId: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });
    const referralLink = `https://positives.life?fpr=${params.referralToken}`;
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life"}/account/affiliate/portal`;

    // Ensure the contact is on the Positives Members list — required for
    // merge tags to resolve correctly in AC email templates.
    await subscribeToList(contactId);

    // Set affiliate custom fields so they are available in AC email templates
    await setFieldValue(contactId, FIELD.affiliateLink,   referralLink);
    await setFieldValue(contactId, FIELD.affiliateToken,  params.referralToken);
    await setFieldValue(contactId, FIELD.affiliatePortal, portalUrl);

    // Apply affiliate tag — this is the trigger for the welcome email automation
    await addTag(contactId, TAG.affiliate);

    console.log(`[AC] Affiliate synced — ${params.email}, token: ${params.referralToken}`);
  } catch (err) {
    console.error("[AC] syncAffiliate failed (non-fatal):", err);
  }
}
