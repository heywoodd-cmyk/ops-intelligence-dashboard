"use client";

import { computeWeeklyDelta } from "@/lib/comparisons";
import type { NormalizedDataset } from "@/lib/schema";
import { Sparkline } from "@/components/Sparkline";

interface KpiTilesProps {
  dataset: NormalizedDataset;
}

// Tinted KPI number colors — each tile gets one accent. The label and
// subline stay zinc-500 for hierarchy.
const OVERDUE_COLOR = "rgba(244, 63, 94, 0.92)";  // faint rose
const BLOCKED_COLOR = "rgba(251, 191, 36, 0.85)"; // faint amber
const ON_TRACK_COLOR = "rgba(52, 211, 153, 0.85)"; // faint emerald
const NEUTRAL_COLOR = "#fafafa";

/**
 * Three KPI tiles with optional 7-point sparklines + comparison subline.
 *
 * IMPORTANT: sparkline + subline are paired. Both depend on
 * computeWeeklyDelta() returning non-null. When the dataset has no
 * weekly_snapshot, neither appears — no orphan sparkline, no orphan subline.
 */
export function KpiTiles({ dataset }: KpiTilesProps) {
  if (!dataset.hasStatus) {
    return (
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Tile
            label="Tasks loaded"
            value={dataset.rowCount}
            subline={null}
            sparkline={null}
            color={NEUTRAL_COLOR}
            animationDelay="0ms"
          />
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

  // Subline + sparkline are computed together — see the helper below.
  const overdueSpark = delta
    ? interpolateWithJitter(delta.overduePrev, overdue, "overdue")
    : null;
  const blockedSpark = delta
    ? interpolateWithJitter(delta.blockedPrev, blocked, "blocked")
    : null;
  const onTrackSpark = delta
    ? interpolateWithJitter(delta.onTrackPrev, onTrack, "ontrack")
    : null;

  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tile
          label="Overdue"
          value={overdue}
          subline={delta ? formatDelta(overdue, delta.overduePrev, "") : null}
          sparkline={overdueSpark}
          color={OVERDUE_COLOR}
          animationDelay="0ms"
        />
        <Tile
          label="Blocked"
          value={blocked}
          subline={delta ? formatDelta(blocked, delta.blockedPrev, "") : null}
          sparkline={blockedSpark}
          color={BLOCKED_COLOR}
          animationDelay="100ms"
        />
        <Tile
          label="On track"
          value={`${onTrack}%`}
          subline={delta ? formatDelta(onTrack, delta.onTrackPrev, "%") : null}
          sparkline={onTrackSpark}
          color={ON_TRACK_COLOR}
          animationDelay="200ms"
        />
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  subline,
  sparkline,
  color,
  animationDelay,
}: {
  label: string;
  value: string | number;
  subline: string | null;
  sparkline: number[] | null;
  color: string;
  animationDelay: string;
}) {
  return (
    <div
      className="card-surface rounded-md p-6 animate-fade-in-up"
      style={{ animationDelay }}
    >
      <p className="text-xs text-muted uppercase tracking-widest mb-3">
        {label}
      </p>
      <p
        className="text-5xl font-medium font-mono tabular-nums tracking-tight"
        style={{ color }}
      >
        {value}
      </p>
      {sparkline && (
        <div className="mt-4">
          <Sparkline points={sparkline} color={color} />
        </div>
      )}
      {subline && <p className="text-xs text-muted mt-3">{subline}</p>}
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

// ---------------------------------------------------------------------
// 7-point sparkline interpolation
// ---------------------------------------------------------------------

/**
 * 7-point sparkline smoothed from weekly snapshot. Jitter is
 * presentational — production would use daily snapshots for a real curve.
 *
 * Endpoints (index 0 = prev value, index 6 = current value) are exact.
 * Intermediate points get ±5% deterministic jitter so the line reads as
 * an organic curve rather than a perfect diagonal. Same inputs always
 * produce the same output — sparkline doesn't dance between renders.
 */
function interpolateWithJitter(
  prev: number,
  current: number,
  seedKey: string
): number[] {
  const points: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6; // 0 .. 1
    const linear = prev + (current - prev) * t;
    if (i === 0 || i === 6) {
      points.push(linear); // anchor endpoints exactly
      continue;
    }
    const magnitude = Math.max(Math.abs(linear), 1); // keep small values visible
    const noise = deterministicNoise(`${seedKey}-${i}-${prev}-${current}`);
    const jitter = (noise - 0.5) * 0.1 * magnitude; // ±5% of magnitude
    points.push(linear + jitter);
  }
  return points;
}

/** Deterministic pseudo-random in [0, 1) from a string seed. */
function deterministicNoise(seed: string): number {
  // Simple string hash → folded into Math.sin for a uniform-ish [0, 1).
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const x = Math.sin(h) * 10_000;
  return x - Math.floor(x);
}
