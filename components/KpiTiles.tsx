"use client";

import { computeWeeklyDelta } from "@/lib/comparisons";
import type { NormalizedDataset } from "@/lib/schema";

interface KpiTilesProps {
  dataset: NormalizedDataset;
}

/**
 * Three KPI tiles. Numbers in Geist Mono, tabular-nums, text-5xl.
 * "On track" stays neutral zinc-50 (absence of warning = fine).
 *
 * Comparison sublines render ONLY when the dataset carries a
 * weekly_snapshot column. computeWeeklyDelta returns null otherwise,
 * the subline disappears, no placeholder or asterisk.
 *
 * When hasStatus === false (no status column anywhere), degrade to a
 * single "Tasks loaded" tile.
 */
export function KpiTiles({ dataset }: KpiTilesProps) {
  if (!dataset.hasStatus) {
    return (
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Tile label="Tasks loaded" value={dataset.rowCount} subline={null} />
        </div>
      </section>
    );
  }

  const total = dataset.rowCount;
  const overdue = dataset.tasks.filter((t) => t.overdue).length;
  const blocked = dataset.tasks.filter((t) => t.status === "Blocked").length;
  const done = dataset.tasks.filter((t) => t.status === "Done").length;
  const onTrack = total > 0 ? Math.round((done / total) * 100) : 0;

  const delta = computeWeeklyDelta(dataset);

  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tile
          label="Overdue"
          value={overdue}
          subline={
            delta ? formatDelta(overdue, delta.overduePrev, "") : null
          }
        />
        <Tile
          label="Blocked"
          value={blocked}
          subline={
            delta ? formatDelta(blocked, delta.blockedPrev, "") : null
          }
        />
        <Tile
          label="On track"
          value={`${onTrack}%`}
          subline={
            delta ? formatDelta(onTrack, delta.onTrackPrev, "%") : null
          }
        />
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  subline,
}: {
  label: string;
  value: string | number;
  subline: string | null;
}) {
  return (
    <div className="bg-card border border-card-border rounded-md p-6">
      <p className="text-xs text-muted uppercase tracking-widest mb-3">
        {label}
      </p>
      <p className="text-5xl font-medium font-mono tabular-nums tracking-tight text-primary">
        {value}
      </p>
      {subline && (
        <p className="text-xs text-muted mt-4">{subline}</p>
      )}
    </div>
  );
}

function formatDelta(
  current: number,
  prev: number,
  suffix: string
): string {
  const prevStr = `${prev}${suffix}`;
  if (current > prev) return `up from ${prevStr} last week`;
  if (current < prev) return `down from ${prevStr} last week`;
  return "unchanged from last week";
}
