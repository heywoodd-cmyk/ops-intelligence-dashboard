"use client";

import type { CanonicalField, NormalizedDataset } from "@/lib/schema";

interface DataQualityBadgeProps {
  dataset: NormalizedDataset;
}

/**
 * Top-right header pill. Hover reveals which canonical fields were
 * mapped, inferred (defaulted/synthesized), and missing from the upload.
 *
 * This is a credibility moment — show your work, no surprises.
 */
export function DataQualityBadge({ dataset }: DataQualityBadgeProps) {
  const mapped = Object.entries(dataset.sourceFields) as Array<
    [CanonicalField, string]
  >;
  const inferred = dataset.inferredFields;
  const missing = dataset.missingFields;

  return (
    <div className="relative group">
      <button
        className="text-xs text-muted hover:text-secondary px-3 py-1.5 rounded-md border border-card-border hover:border-card-border transition-colors flex items-center gap-2"
        aria-label="Data quality details"
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
          style={{ backgroundColor: "#8b5cf6" }}
        />
        Data quality
      </button>

      {/* Hover popover — pt-2 gap absorbs cursor movement */}
      <div className="absolute right-0 top-full pt-2 z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
        <div className="w-80 p-5 card-surface rounded-md shadow-2xl space-y-4">
          {mapped.length > 0 && (
            <Section
              label="Mapped"
              count={mapped.length}
              items={mapped.map(
                ([field, source]) => `${field} ← ${source}`
              )}
            />
          )}
          {inferred.length > 0 && (
            <Section
              label="Inferred"
              count={inferred.length}
              items={inferred.map((f) => `${f}`)}
              note="defaulted or synthesized"
            />
          )}
          {missing.length > 0 && (
            <Section
              label="Missing"
              count={missing.length}
              items={missing.map((f) => `${f}`)}
            />
          )}
          {dataset.parseErrors.length > 0 && (
            <div className="pt-3 border-t border-card-border">
              <p className="text-xs text-muted">
                {dataset.parseErrors.length}{" "}
                {dataset.parseErrors.length === 1
                  ? "cell could not be parsed"
                  : "cells could not be parsed"}
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  count,
  items,
  note,
}: {
  label: string;
  count: number;
  items: string[];
  note?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
        {label} · {count}
        {note ? (
          <span className="normal-case tracking-normal"> — {note}</span>
        ) : null}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-xs text-secondary font-mono">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
