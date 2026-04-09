/**
 * components/FirstPromoterTracker.tsx
 *
 * NOTE: This component is intentionally empty.
 * FP tracking scripts are loaded directly in app/layout.tsx (Server Component)
 * because Next.js requires `beforeInteractive` scripts to be placed in the
 * root layout, not inside child components (client or server).
 *
 * See: /public/fprmain.js for the init script content.
 * See: app/layout.tsx for the Script tags.
 */
export function FirstPromoterTracker() {
  return null;
}
