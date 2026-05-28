"use client";

import { HelpCircle } from "lucide-react";
import { computeWeeklyDelta } from "@/lib/comparisons";
import type { NormalizedDataset } from "@/lib/schema";
import { Sparkline } from "@/components/Sparkline";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import type { KpiDrillKind } from "@/components/KpiDrillModal";

interface KpiTilesProps {
  dataset: NormalizedDataset;
  /** Click handler — opens the receipts modal for that KPI. */
  onDrillThrough?: (kind: KpiDrillKind) => void;
}

const OVERDUE_COLOR = "rgba(244, 63, 94, 0.92)";
const BLOCKED_COLOR = "rgba(251, 191, 36, 0.85)";
const ON_TRACK_COLOR = "rgba(52, 211, 153, 0.85)";
const NEUTRAL_COLOR = "#fafafa";

/**
 * Three KPI tiles. Each tile is clickable, opening a panel that lists
 * the exact rows behind its number. Tooltips include the derivation
 * rule and the live count, not just a plain-language definition.
 *
 * Reconciliation strip renders below the tile row: proves nothing was
 * silently dropped between the source CSV and the metrics.
 */
export function KpiTiles({ dataset, onDrillThrough }: KpiTilesProps) {
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
        <ReconciliationStrip dataset={dataset} />
      </section>
    );
  }

  const total = dataset.rowCount;
  const overdue = dataset.tasks.filter((t) => t.overdue).length;
  const blocked = dataset.tasks.filter((t) => t.status === "Blocked").length;
  const done = dataset.tasks.filter((t) => t.status === "Done").length;
  const onTrack = total > 0 ? Math.round((done / total) * 100) : 0;

  const delta = computeWeeklyDelta(dataset);

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
          tooltip={`Tasks past their due date that aren't done yet. Counted: ${overdue} of ${total} rows where due date < today and status ≠ Done.`}
          value={overdue}
          subline={delta ? formatDelta(overdue, delta.overduePrev, "") : null}
          sparkline={overdueSpark}
          color={OVERDUE_COLOR}
          animationDelay="0ms"
          onClick={() => onDrillThrough?.("overdue")}
        />
        <Tile
          label="Blocked"
          tooltip={`Tasks where the assignee is waiting on something or someone. Counted: ${blocked} of ${total} rows where status = Blocked.`}
          value={blocked}
          subline={delta ? formatDelta(blocked, delta.blockedPrev, "") : null}
          sparkline={blockedSpark}
          color={BLOCKED_COLOR}
          animationDelay="100ms"
          onClick={() => onDrillThrough?.("blocked")}
        />
        <Tile
          label="Completed"
          tooltip={`Percentage of tasks marked Done out of the total tracked. Counted: ${done} of ${total} rows where status = Done.`}
          value={onTrack}
          suffix="%"
          subline={delta ? formatDelta(onTrack, delta.onTrackPrev, "%") : null}
          sparkline={onTrackSpark}
          color={ON_TRACK_COLOR}
          animationDelay="200ms"
          onClick={() => onDrillThrough?.("completed")}
        />
      </div>
      <ReconciliationStrip dataset={dataset} />
    </section>
  );
}

interface TileProps {
  label: string;
  tooltip?: string;
  value: number | string;
  suffix?: string;
  subline: string | null;
  sparkline: number[] | null;
  color: string;
  animationDelay: string;
  onClick?: () => void;
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
  onClick,
}: TileProps) {
  // The tile is a button when clickable — gives keyboard focus + Enter,
  // and reads as interactive to screen readers and to the eye.
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`card-surface rounded-md p-6 animate-fade-in-up text-left w-full ${
        onClick
          ? "cursor-pointer hover:ring-1 hover:ring-zinc-700 focus-visible:ring-2 focus-visible:ring-violet-500/60 outline-none transition-[box-shadow]"
          : ""
      }`}
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
    </Wrapper>
  );
}

/**
 * Reconciliation strip — proves no rows were silently dropped between
 * the source CSV and the dashboard metrics. With the current pipeline
 * the excluded count is always 0, but wiring rawRowCount through the
 * dataset makes the integrity check honest and ready for any future
 * exclusion logic.
 */
function ReconciliationStrip({
  dataset,
}: {
  dataset: NormalizedDataset;
}) {
  const loaded = dataset.rawRowCount ?? dataset.rowCount;
  const counted = dataset.rowCount;
  const excluded = Math.max(0, loaded - counted);

  return (
    <p className="text-xs text-muted text-center mt-3">
      {loaded.toLocaleString()} {loaded === 1 ? "row" : "rows"} loaded ·{" "}
      {counted.toLocaleString()} counted in metrics · {excluded.toLocaleString()}{" "}
      excluded
    </p>
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

function LabelTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group/tip">
      <HelpCircle
        className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-help"
        aria-label="Definition"
      />
      <span
        role="tooltip"
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tip:block w-64 card-surface px-3 py-2 text-xs text-secondary leading-relaxed rounded-md shadow-2xl z-20 normal-case tracking-normal font-normal"
      >
        {text}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------
// Sparkline interpolation
// ---------------------------------------------------------------------

/**
 * 7-point sparkline smoothed from weekly snapshot. Jitter is
 * presentational — production would use daily snapshots for a real curve.
 *
 * Endpoints (index 0 = prev, index 6 = current) are exact. Intermediate
 * points get ±5% deterministic jitter. Seed depends ONLY on tile
 * identity + point index — never on prev/current. That way edits shift
 * the endpoints but the curve wiggle pattern stays stable; magnitudes
 * scale with the line.
 */
function interpolateWithJitter(
  prev: number,
  current: number,
  seedKey: string
): number[] {
  const points: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const linear = prev + (current - prev) * t;
    if (i === 0 || i === 6) {
      points.push(linear);
      continue;
    }
    const magnitude = Math.max(Math.abs(linear), 1);
    const noise = deterministicNoise(`${seedKey}-${i}`);
    const jitter = (noise - 0.5) * 0.1 * magnitude;
    points.push(linear + jitter);
  }
  return points;
}

function deterministicNoise(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const x = Math.sin(h) * 10_000;
  return x - Math.floor(x);
}
