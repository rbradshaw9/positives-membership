import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getStripe } from "@/lib/stripe/config";
import { config } from "@/lib/config";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

const getL2Price = unstable_cache(
  async () => {
    const priceId = config.stripe.prices.level2Monthly;
    if (!priceId) return null;
    try {
      const stripe = getStripe();
      const price = await stripe.prices.retrieve(priceId);
      if (!price.unit_amount) return null;
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (price.currency ?? "usd").toUpperCase(),
      }).format(price.unit_amount / 100);
    } catch {
      return null;
    }
  },
  ["l2-monthly-price"],
  { revalidate: 3600 }
);

export async function UpgradeCard() {
  const priceLabel = await getL2Price();

  return (
    <SurfaceCard elevated className="surface-card--editorial">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="member-detail-kicker">Unlock more with Positives Plus</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
            Upgrade to Positives Plus
          </h2>
          {priceLabel && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {priceLabel}/month
            </p>
          )}
        </div>
        <span className="text-2xl flex-shrink-0" aria-hidden="true">⭐</span>
      </div>

      <ul className="mt-4 space-y-2">
        {[
          "Priority access to new content and features",
          "Advanced practice tools and deeper archives",
          "Exclusive Plus-member events and sessions",
        ].map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E8C78"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 flex-shrink-0"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {benefit}
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Link
          href="/account/upgrade-confirm"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
            boxShadow: "0 4px 14px rgba(47,111,237,0.25)",
          }}
        >
          Upgrade now →
        </Link>
      </div>
    </SurfaceCard>
  );
}
