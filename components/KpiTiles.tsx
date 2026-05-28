"use client";

import { HelpCircle } from "lucide-react";
import { computeWeeklyDelta } from "@/lib/comparisons";
import type { NormalizedDataset } from "@/lib/schema";
import { Sparkline } from "@/components/Sparkline";
import { AnimatedNumber } from "@/components/AnimatedNumber";

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
          tooltip="Tasks past their due date that aren't done yet."
          value={overdue}
          subline={delta ? formatDelta(overdue, delta.overduePrev, "") : null}
          sparkline={overdueSpark}
          color={OVERDUE_COLOR}
          animationDelay="0ms"
        />
        <Tile
          label="Blocked"
          tooltip="Tasks where the assignee is waiting on something or someone."
          value={blocked}
          subline={delta ? formatDelta(blocked, delta.blockedPrev, "") : null}
          sparkline={blockedSpark}
          color={BLOCKED_COLOR}
          animationDelay="100ms"
        />
        <Tile
          label="Completed"
          tooltip="Percentage of tasks marked Done out of the total tracked."
          value={onTrack}
          suffix="%"
          subline={delta ? formatDelta(onTrack, delta.onTrackPrev, "%") : null}
          sparkline={onTrackSpark}
          color={ON_TRACK_COLOR}
          animationDelay="200ms"
        />
      </div>
    </section>
  );
}

interface TileProps {
  label: string;
  /** Plain-language definition shown on hovering the ? icon. Optional. */
  tooltip?: string;
  /**
   * Numeric value when the tile should count-up; strings render as-is
   * (used for the degraded "Tasks loaded" tile, which has no animation
   * meaning beyond initial render).
   */
  value: number | string;
  /** Optional suffix applied during AnimatedNumber rendering (e.g. "%"). */
  suffix?: string;
  subline: string | null;
  sparkline: number[] | null;
  color: string;
  animationDelay: string;
}

function Tile({
  label,
  tooltip,
  value,
  suffix = "",
  subline,
  sparkline,
  color,
  animationDelay,
}: TileProps) {
  return (
    <div
      className="card-surface rounded-md p-6 animate-fade-in-up"
      style={{ animationDelay }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-xs text-muted uppercase tracking-widest">
          {label}
        </p>
        {tooltip && <LabelTooltip text={tooltip} />}
      </div>
      <p
        className="text-5xl font-medium font-mono tabular-nums tracking-tight"
        style={{ color }}
      >
        {typeof value === "number" ? (
          <AnimatedNumber
            value={value}
            format={(n) => `${Math.round(n)}${suffix}`}
          />
        ) : (
          value
        )}
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

/**
 * CSS-only hover tooltip. Sits above the help icon, fixed-width wrap.
 * No library, no portal — relies on the parent being position: relative
 * to anchor the absolute popover.
 */
function LabelTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group/tip">
      <HelpCircle
        className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-help"
        aria-label="Definition"
      />
      <span
        role="tooltip"
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tip:block w-48 card-surface px-3 py-2 text-xs text-secondary leading-relaxed rounded-md shadow-2xl z-20 normal-case tracking-normal font-normal"
      >
        {text}
      </span>
    </span>
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
 * Intermediate points get ±5% deterministic jitter. Seed depends ONLY on
 * the tile identity (seedKey) and the point index — NOT on the prev or
 * current value. That way edits to the dataset shift the endpoints but
 * keep the curve's wiggle pattern stable; magnitudes scale with the
 * line. Without this, every status edit would reroll the entire curve
 * shape and read as a flicker.
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
    const noise = deterministicNoise(`${seedKey}-${i}`);
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
