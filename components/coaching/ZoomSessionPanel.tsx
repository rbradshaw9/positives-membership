import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

type ZoomSessionPanelProps = {
  zoomJoinUrl: string | null;
  role: "member" | "coach";
  otherPartyName: string;
  manageUrl?: string;
};

export function ZoomSessionPanel({
  zoomJoinUrl,
  role,
  otherPartyName,
  manageUrl,
}: ZoomSessionPanelProps) {
  if (!zoomJoinUrl) {
    return (
      <SurfaceCard padding="lg" className="border border-amber-200 bg-amber-50/70">
        <p className="text-sm font-semibold text-amber-950">Zoom link is not attached yet.</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">
          This booking is confirmed, but Zoom was not created automatically. An admin can attach the Zoom link from the coaching dashboard.
        </p>
        {manageUrl ? (
          <Button href={manageUrl} variant="outline" size="sm" className="mt-4">
            View booking details
          </Button>
        ) : null}
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard elevated className="surface-card--editorial">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="member-detail-kicker">Zoom session</p>
          <h2 className="mt-2 font-heading text-xl font-semibold text-foreground">
            {role === "coach" ? `Meet with ${otherPartyName}` : `Meet with ${otherPartyName}`}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Zoom is the session room for this appointment. The link opens in a new tab.
          </p>
        </div>
        <Button
          href={zoomJoinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="justify-center"
        >
          Join Zoom session
        </Button>
      </div>
    </SurfaceCard>
  );
}
