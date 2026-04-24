import { Logo } from "@/components/marketing/Logo";
import { PublicTrackedLink } from "@/components/marketing/PublicTrackedLink";

type PublicHeaderLink = {
  href: string;
  label: string;
  hiddenOnMobile?: boolean;
};

interface PublicSiteHeaderProps {
  signInHref: string;
  signInLabel: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  navLinks?: PublicHeaderLink[];
}

export function PublicSiteHeader({
  signInHref,
  signInLabel,
  primaryCtaHref,
  primaryCtaLabel,
  navLinks = [],
}: PublicSiteHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "rgba(250,250,248,0.90)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(221,215,207,0.55)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-4">
        <Logo kind="wordmark" height={24} href="/" />

        <nav className="flex items-center gap-3 sm:gap-6" aria-label="Public site navigation">
          {navLinks.map((link) => (
            <PublicTrackedLink
              key={`${link.href}-${link.label}`}
              href={link.href}
              className={`${link.hiddenOnMobile ? "hidden md:block" : ""} text-xs sm:text-sm font-medium`}
              style={{ color: "#68707A" }}
            >
              {link.label}
            </PublicTrackedLink>
          ))}

          <PublicTrackedLink href={signInHref} className="text-xs sm:text-sm font-medium" style={{ color: "#68707A" }}>
            {signInLabel}
          </PublicTrackedLink>

          {primaryCtaHref && primaryCtaLabel ? (
            <PublicTrackedLink
              href={primaryCtaHref}
              className="rounded-full px-4 py-2 text-xs font-semibold sm:px-5 sm:py-2.5 sm:text-sm"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(47,111,237,0.28)",
                letterSpacing: "-0.01em",
              }}
            >
              {primaryCtaLabel}
            </PublicTrackedLink>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
