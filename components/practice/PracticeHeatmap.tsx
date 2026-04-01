interface PracticeHeatmapProps {
  values: Array<{ date: string; active: boolean }>;
}

export function PracticeHeatmap({ values }: PracticeHeatmapProps) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-2 sm:grid-cols-14">
        {values.map((cell) => (
          <div
            key={cell.date}
            className="aspect-square rounded-[4px]"
            style={{
              background: cell.active
                ? "var(--color-primary)"
                : "color-mix(in srgb, var(--color-muted) 85%, white)",
              opacity: cell.active ? 1 : 0.95,
            }}
            title={cell.date}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-muted" />
          No practice
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-primary" />
          Practiced
        </span>
      </div>
    </div>
  );
}
