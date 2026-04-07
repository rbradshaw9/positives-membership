/**
 * types/rewardful.d.ts
 *
 * Global type declarations for the Rewardful JS SDK.
 * Rewardful injects these onto window via their snippet (r.wdfl.co/rw.js).
 */

interface RewardfulInstance {
  /** UUID of the current visitor's referral — set when they arrive via affiliate link */
  referral: string | undefined;
  /** Affiliate token string (e.g. "abc123") */
  token: string | undefined;
}

declare global {
  interface Window {
    /** Queue function — call before SDK loads to register callbacks */
    rewardful: (event: "ready", callback: () => void) => void;
    /** Populated by SDK after load */
    Rewardful: RewardfulInstance | undefined;
  }
}

export {};
