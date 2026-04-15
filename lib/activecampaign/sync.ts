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
 *   affiliate       → 9
 *   welcome_ready   → 14
 *   trial_started   → 15
 *   payment_succeeded → 16
 *   trial_ending    → 17
 *   tier_changed    → 18
 *   payment_failed  → 19
 *   first_login_complete → 20
 *   access_restored → 23
 *   membership_reactivated → 24
 *   event_reminder_24h → 25
 *   event_reminder_1h → 26
 *   event_replay_ready → 27
 *   coaching_reminder_24h → 28
 *   coaching_reminder_1h → 29
 *   coaching_replay_ready → 30
 *   affiliate_payout_failed → 32
 *
 * List IDs:
 *   Positives Audience → 3
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
  // New lifecycle triggers — created 2026-04-14.
  welcome_ready:       14,
  trial_started:       15,
  payment_succeeded:   16,
  trial_ending:        17,
  tier_changed:        18,
  payment_failed:      19,
  first_login_complete: 20,
  access_restored:     23,
  membership_reactivated: 24,
  event_reminder_24h:  25,
  event_reminder_1h:   26,
  event_replay_ready:  27,
  coaching_reminder_24h: 28,
  coaching_reminder_1h: 29,
  coaching_replay_ready: 30,
  affiliate_payout_failed: 32,
} as const;

/** Custom field IDs (created 2026-04-07) */
const FIELD = {
  membershipTier:    2,
  memberSince:       3,
  stripeCustomerId:  4,
  affiliateLink:     5,
  affiliateToken:    6,
  affiliatePortal:   7,
  billingLink:       9, // Signed billing recovery URL for payment-failed emails
  // New transactional merge fields — created 2026-04-14.
  loginLink:         13,
  trialEndDate:      14,
  amountPaid:        15,
  invoiceNumber:     16,
  invoiceUrl:        17,
  nextBillingDate:   18,
  previousTier:      19,
  newTier:           20,
  planName:          21,
  firstLoginAt:      22,
  accessRestoredAt:  23,
  reactivatedAt:     24,
  canceledAt:        25,
  paidThroughAt:     26,
  nextEventTitle:    27,
  nextEventStartsAt: 28,
  nextEventJoinUrl:  29,
  nextEventReplayUrl: 30,
  nextEventTier:     31,
  nextEventType:     32,
  affiliatePayoutError: 33,
  affiliatePayoutEmail: 34,
  affiliatePayoutFailedAt: 35,
  affiliatePayoutAmount: 36,
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

type ReminderTriggerTag =
  | "event_reminder_24h"
  | "event_reminder_1h"
  | "event_replay_ready"
  | "coaching_reminder_24h"
  | "coaching_reminder_1h"
  | "coaching_replay_ready";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Upsert a contact in AC. Returns the AC contact ID. */
async function syncContact(payload: ContactSyncPayload): Promise<string> {
  const res = await ac.post<ContactSyncResponse>("/contact/sync", {
    contact: {
      email: payload.email,
      ...(payload.firstName?.trim()
        ? { firstName: payload.firstName.trim() }
        : {}),
      ...(payload.lastName?.trim()
        ? { lastName: payload.lastName.trim() }
        : {}),
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

/** Mark a contact as unsubscribed on the Positives Members list. */
async function unsubscribeFromList(contactId: string): Promise<void> {
  await ac.post("/contactLists", {
    contactList: {
      list: LIST_ID,
      contact: contactId,
      status: 2, // 2 = unsubscribed
    },
  });
}

/** Add a tag to a contact by tag ID. */
async function addTag(contactId: string, tagId: number): Promise<void> {
  await ac.post("/contactTags", {
    contactTag: { contact: contactId, tag: tagId },
  });
}

function isConfiguredId(id: number): boolean {
  return Number.isFinite(id) && id > 0;
}

async function addTagIfConfigured(
  contactId: string,
  tagId: number,
  label: string
): Promise<void> {
  if (!isConfiguredId(tagId)) {
    console.warn(`[AC] Tag "${label}" is not configured (ID missing).`);
    return;
  }
  await addTag(contactId, tagId);
}

async function removeTagIfConfigured(
  contactId: string,
  tagId: number
): Promise<void> {
  if (!isConfiguredId(tagId)) return;
  await removeTagIfPresent(contactId, tagId);
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

async function setFieldValueIfConfigured(
  contactId: string,
  fieldId: number,
  value: string | undefined,
  label: string
): Promise<void> {
  if (!value || !isConfiguredId(fieldId)) {
    if (!isConfiguredId(fieldId)) {
      console.warn(`[AC] Field "${label}" is not configured (ID missing).`);
    }
    return;
  }
  await setFieldValue(contactId, fieldId, value);
}

async function syncExactTierState(
  contactId: string,
  tier: SubscriptionTier
): Promise<void> {
  for (const [candidateTier, tagId] of Object.entries(TIER_TAG) as Array<
    [SubscriptionTier, number]
  >) {
    if (candidateTier === tier) continue;
    await removeTagIfPresent(contactId, tagId);
  }

  await addTag(contactId, TIER_TAG[tier]);
  await setFieldValue(contactId, FIELD.membershipTier, tier);
}

// ─── Public sync functions ────────────────────────────────────────────────────

/**
 * Called on checkout.session.completed.
 * Creates/updates the contact in AC, optionally subscribes them to the list,
 * applies their tier tag, and applies founding_member.
 */
export async function syncNewMember(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tier: SubscriptionTier;
  stripeCustomerId?: string;
  subscribeToMarketing?: boolean;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({
      email:     params.email,
      firstName: params.firstName,
      lastName:  params.lastName,
      phone:     params.phone,
    });

    if (params.subscribeToMarketing ?? true) {
      await subscribeToList(contactId);
    }
    await syncExactTierState(contactId, params.tier);
    await addTag(contactId, TAG.founding_member);

    // Write searchable custom fields
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
 * By default, this does not silently re-subscribe contacts who previously
 * opted out of marketing.
 */
export async function syncTierChange(params: {
  email: string;
  oldTier: SubscriptionTier | null;
  newTier: SubscriptionTier;
  planName?: string;
  subscribeToMarketing?: boolean;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    if (params.oldTier && params.oldTier !== params.newTier) {
      await removeTagIfPresent(contactId, TIER_TAG[params.oldTier]);
    }

    await syncExactTierState(contactId, params.newTier);

    await setFieldValueIfConfigured(
      contactId,
      FIELD.previousTier,
      params.oldTier ?? undefined,
      "Previous Tier"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.newTier,
      params.newTier,
      "New Tier"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.planName,
      params.planName,
      "Plan Name"
    );
    await addTagIfConfigured(contactId, TAG.tier_changed, "tier_changed");

    if (params.subscribeToMarketing ?? false) {
      await subscribeToList(contactId);
    }

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

export async function syncCancellationState(params: {
  email: string;
  tier: SubscriptionTier | null;
  canceledAt?: string;
  paidThroughAt?: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    if (params.tier) {
      await removeTagIfPresent(contactId, TIER_TAG[params.tier]);
    }

    await addTag(contactId, TAG.canceled);
    await removeTagIfPresent(contactId, TAG.past_due);
    await removeTagIfConfigured(contactId, TAG.payment_failed);
    await removeTagIfConfigured(contactId, TAG.access_restored);

    await setFieldValueIfConfigured(contactId, FIELD.canceledAt, params.canceledAt, "Canceled At");
    await setFieldValueIfConfigured(contactId, FIELD.paidThroughAt, params.paidThroughAt, "Paid Through At");

    console.log(`[AC] Cancellation state synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncCancellationState failed (non-fatal):", err);
  }
}

export async function syncCancellationCleared(params: {
  email: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });
    await removeTagIfPresent(contactId, TAG.canceled);

    console.log(`[AC] Cancellation cleared — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncCancellationCleared failed (non-fatal):", err);
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
    await addTagIfConfigured(contactId, TAG.payment_failed, "payment_failed");

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
    await removeTagIfConfigured(contactId, TAG.payment_failed);

    console.log(`[AC] Payment recovered — past_due tag removed for ${params.email}`);
  } catch (err) {
    console.error("[AC] syncPaymentRecovered failed (non-fatal):", err);
  }
}

export async function syncAccessRestored(params: {
  email: string;
  accessRestoredAt?: string;
  loginLink?: string;
  planName?: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    await setFieldValueIfConfigured(
      contactId,
      FIELD.accessRestoredAt,
      params.accessRestoredAt,
      "Access Restored At"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.loginLink,
      params.loginLink,
      "Login Link"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.planName,
      params.planName,
      "Plan Name"
    );

    await removeTagIfPresent(contactId, TAG.past_due);
    await removeTagIfConfigured(contactId, TAG.payment_failed);
    await addTagIfConfigured(contactId, TAG.access_restored, "access_restored");

    console.log(`[AC] Access restored synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncAccessRestored failed (non-fatal):", err);
  }
}

export async function syncPaymentSucceeded(params: {
  email: string;
  amountPaid?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  nextBillingDate?: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    await setFieldValueIfConfigured(
      contactId,
      FIELD.amountPaid,
      params.amountPaid,
      "Amount Paid"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.invoiceNumber,
      params.invoiceNumber,
      "Invoice Number"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.invoiceUrl,
      params.invoiceUrl,
      "Invoice URL"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.nextBillingDate,
      params.nextBillingDate,
      "Next Billing Date"
    );

    await addTagIfConfigured(contactId, TAG.payment_succeeded, "payment_succeeded");

    console.log(`[AC] Payment succeeded synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncPaymentSucceeded failed (non-fatal):", err);
  }
}

export async function syncTrialEnding(params: {
  email: string;
  trialEndDate?: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    await setFieldValueIfConfigured(
      contactId,
      FIELD.trialEndDate,
      params.trialEndDate,
      "Trial End Date"
    );
    await addTagIfConfigured(contactId, TAG.trial_ending, "trial_ending");

    console.log(`[AC] Trial ending synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncTrialEnding failed (non-fatal):", err);
  }
}

export async function syncWelcomeEmail(params: {
  email: string;
  loginLink: string;
  planName?: string;
  trialEndDate?: string;
  isTrial?: boolean;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    await setFieldValueIfConfigured(
      contactId,
      FIELD.loginLink,
      params.loginLink,
      "Login Link"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.planName,
      params.planName,
      "Plan Name"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.trialEndDate,
      params.trialEndDate,
      "Trial End Date"
    );

    if (params.isTrial) {
      await addTagIfConfigured(contactId, TAG.trial_started, "trial_started");
    } else {
      await addTagIfConfigured(contactId, TAG.welcome_ready, "welcome_ready");
    }

    console.log(`[AC] Welcome email synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncWelcomeEmail failed (non-fatal):", err);
  }
}

export async function syncMembershipReactivated(params: {
  email: string;
  loginLink?: string;
  planName?: string;
  trialEndDate?: string;
  reactivatedAt?: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    await setFieldValueIfConfigured(contactId, FIELD.loginLink, params.loginLink, "Login Link");
    await setFieldValueIfConfigured(contactId, FIELD.planName, params.planName, "Plan Name");
    await setFieldValueIfConfigured(contactId, FIELD.trialEndDate, params.trialEndDate, "Trial End Date");
    await setFieldValueIfConfigured(contactId, FIELD.reactivatedAt, params.reactivatedAt, "Reactivated At");

    await removeTagIfPresent(contactId, TAG.canceled);
    await addTagIfConfigured(
      contactId,
      TAG.membership_reactivated,
      "membership_reactivated"
    );

    console.log(`[AC] Membership reactivated synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncMembershipReactivated failed (non-fatal):", err);
  }
}

export async function syncFirstLoginComplete(params: {
  email: string;
  firstLoginAt?: string;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    await setFieldValueIfConfigured(
      contactId,
      FIELD.firstLoginAt,
      params.firstLoginAt,
      "First Login At"
    );

    await addTagIfConfigured(
      contactId,
      TAG.first_login_complete,
      "first_login_complete"
    );

    // These launch-trigger tags only need to start their automations once.
    await removeTagIfConfigured(contactId, TAG.welcome_ready);
    await removeTagIfConfigured(contactId, TAG.trial_started);

    console.log(`[AC] First login synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncFirstLoginComplete failed (non-fatal):", err);
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
  subscribeToMarketing?: boolean;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });
    const referralLink = `https://positives.life?fpr=${params.referralToken}`;
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life"}/account/affiliate`;

    if (params.subscribeToMarketing ?? false) {
      await subscribeToList(contactId);
    }

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

export async function syncAffiliatePayoutFailed(params: {
  email: string;
  payoutError: string;
  payoutEmail?: string | null;
  failedAt: string;
  payoutAmount?: string | number | null;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    await setFieldValueIfConfigured(
      contactId,
      FIELD.affiliatePayoutError,
      params.payoutError,
      "Affiliate Payout Error"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.affiliatePayoutEmail,
      params.payoutEmail ?? undefined,
      "Affiliate Payout Email"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.affiliatePayoutFailedAt,
      params.failedAt,
      "Affiliate Payout Failed At"
    );
    await setFieldValueIfConfigured(
      contactId,
      FIELD.affiliatePayoutAmount,
      params.payoutAmount === null || params.payoutAmount === undefined
        ? undefined
        : String(params.payoutAmount),
      "Affiliate Payout Amount"
    );

    // Reusable trigger: remove first so a resolved previous issue cannot block
    // a new failed payout from entering the AC automation.
    await removeTagIfConfigured(contactId, TAG.affiliate_payout_failed);
    await addTagIfConfigured(
      contactId,
      TAG.affiliate_payout_failed,
      "affiliate_payout_failed"
    );

    console.log(`[AC] Affiliate payout failure synced — ${params.email}`);
  } catch (err) {
    console.error("[AC] syncAffiliatePayoutFailed failed (non-fatal):", err);
  }
}

/**
 * Called when a member explicitly changes their marketing preference.
 * This keeps ActiveCampaign's list status aligned with the product's
 * `member.email_unsubscribed` flag.
 */
export async function syncMarketingPreference(params: {
  email: string;
  subscribe: boolean;
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    if (params.subscribe) {
      await subscribeToList(contactId);
    } else {
      await unsubscribeFromList(contactId);
    }

    console.log(
      `[AC] Marketing preference updated — ${params.email}: ${params.subscribe ? "subscribed" : "unsubscribed"}`
    );
  } catch (err) {
    console.error("[AC] syncMarketingPreference failed (non-fatal):", err);
  }
}

export async function syncReminderContext(params: {
  email: string;
  triggerTag: ReminderTriggerTag;
  title: string;
  startsAt: string;
  joinUrl?: string;
  replayUrl?: string;
  eventTier: SubscriptionTier;
  eventType: "event" | "coaching";
}): Promise<void> {
  if (!acIsConfigured()) return;

  try {
    const contactId = await syncContact({ email: params.email });

    await setFieldValueIfConfigured(contactId, FIELD.nextEventTitle, params.title, "Next Event Title");
    await setFieldValueIfConfigured(contactId, FIELD.nextEventStartsAt, params.startsAt, "Next Event Starts At");
    await setFieldValueIfConfigured(contactId, FIELD.nextEventJoinUrl, params.joinUrl, "Next Event Join URL");
    await setFieldValueIfConfigured(contactId, FIELD.nextEventReplayUrl, params.replayUrl, "Next Event Replay URL");
    await setFieldValueIfConfigured(contactId, FIELD.nextEventTier, params.eventTier, "Next Event Tier");
    await setFieldValueIfConfigured(contactId, FIELD.nextEventType, params.eventType, "Next Event Type");

    await addTagIfConfigured(contactId, TAG[params.triggerTag], params.triggerTag);

    console.log(`[AC] Reminder context synced — ${params.email}, tag: ${params.triggerTag}`);
  } catch (err) {
    console.error("[AC] syncReminderContext failed (non-fatal):", err);
  }
}
