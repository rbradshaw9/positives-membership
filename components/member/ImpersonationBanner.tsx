type ImpersonationBannerProps = {
  memberName?: string | null;
};

export function ImpersonationBanner({ memberName }: ImpersonationBannerProps) {
  const label = memberName?.trim() || "this member";

  return (
    <div className="border-b border-amber-300/30 bg-amber-50 text-slate-950">
      <div className="member-container flex flex-col gap-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Support session: viewing as {label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-700">
            Exit when you are finished. This will close the member session and return you to the
            admin member profile.
          </p>
        </div>
        <a
          href="/auth/impersonate/exit"
          className="inline-flex w-fit items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Exit to admin
        </a>
      </div>
    </div>
  );
}
