"use client";

import { attentionRows, type AttentionRow } from "@/lib/urgency";
import type { NormalizedDataset } from "@/lib/schema";

interface AttentionListProps {
  dataset: NormalizedDataset;
  onTaskClick?: (id: string) => void;
}

const ROSE = "#f43f5e";
const ROSE_BUDGET = 3; // max rose dots visible per spec

/**
 * Deterministic "What needs your attention" panel. attentionRows()
 * returns 0-5 rows (top urgency + optional synthesized standup).
 * Hidden entirely when there's nothing to attend to.
 */
export function AttentionList({ dataset, onTaskClick }: AttentionListProps) {
  const rows = attentionRows(dataset);
  if (rows.length === 0) return null;

  // Enforce rose budget at render time — first N rose:true rows get the
  // dot, subsequent ones go silent.
  let roseRemaining = ROSE_BUDGET;
  const rendered = rows.map((row) => {
    const showRose = row.rose && roseRemaining > 0;
    if (showRose) roseRemaining--;
    return { row, showRose };
  });

  return (
    <section>
      <p className="text-xs text-muted uppercase tracking-widest mb-4">
        What needs your attention
      </p>
      <div className="bg-card border border-card-border rounded-md divide-y divide-card-border">
        {rendered.map(({ row, showRose }, i) => (
          <Row
            key={i}
            row={row}
            showRose={showRose}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </section>
  );
}

function Row({
  row,
  showRose,
  onTaskClick,
}: {
  row: AttentionRow;
  showRose: boolean;
  onTaskClick?: (id: string) => void;
}) {
  const isStandup = !!row.synthesized;
  const handleClick = () => {
    if (isStandup) return; // Day-2 — agenda generation
    if (row.taskId) onTaskClick?.(row.taskId);
  };

  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showRose ? (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: ROSE }}
            aria-hidden
          />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
        )}
        <span className="text-sm text-primary truncate">{row.sentence}</span>
      </div>
      <button
        onClick={handleClick}
        className="text-xs text-secondary px-3 py-1.5 rounded-md hover:bg-card-border transition-colors flex-shrink-0"
      >
        {row.action}
      </button>
    </div>
  );
}
