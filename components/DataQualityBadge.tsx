"use client";

import type { CanonicalField, NormalizedDataset } from "@/lib/schema";
import {
  integrityIsClean,
  runIntegrityChecks,
} from "@/lib/integrity";

interface DataQualityBadgeProps {
  dataset: NormalizedDataset;
}

/**
 * Top-right header pill. Hover reveals what the ingestion pipeline did
 * with the uploaded data, plus deterministic integrity checks that run
 * against the current (post-edit) dataset on every render.
 */
export function DataQualityBadge({ dataset }: DataQualityBadgeProps) {
  const aiSet = new Set<CanonicalField>(dataset.aiMappedFields ?? []);
  const inferredSet = new Set<CanonicalField>(dataset.inferredFields);

  const allSourceEntries = Object.entries(dataset.sourceFields) as Array<
    [CanonicalField, string]
  >;
  const recognized = allSourceEntries.filter(([f]) => !aiSet.has(f));
  const matchedWithAI = allSourceEntries.filter(([f]) => aiSet.has(f));

  const missingItems = [
    ...dataset.missingFields,
    ...dataset.inferredFields,
  ].map((f) => ({
    field: f,
    defaulted: inferredSet.has(f),
  }));

  // Integrity checks run on every render so post-edit numbers stay
  // honest (mark a row Done → completedButNotDone may shrink).
  const integrity = runIntegrityChecks(dataset);
  const clean = integrityIsClean(integrity);

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
        Check data quality
      </button>

      <div className="absolute right-0 top-full pt-2 z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
        <div className="w-80 p-5 card-surface rounded-md shadow-2xl space-y-4">
          <p className="text-xs text-secondary">
            Here&apos;s what we found in your data:
          </p>

          {recognized.length > 0 && (
            <Section
              label="Recognized"
              count={recognized.length}
              items={recognized.map(
                ([field, source]) => `${prettyField(field)} ← ${source}`
              )}
            />
          )}

          {matchedWithAI.length > 0 && (
            <Section
              label="Matched with AI"
              count={matchedWithAI.length}
              items={matchedWithAI.map(
                ([field, source]) => `${prettyField(field)} ← ${source}`
              )}
            />
          )}

          {missingItems.length > 0 && (
            <Section
              label="Missing"
              count={missingItems.length}
              items={missingItems.map(({ field, defaulted }) =>
                defaulted
                  ? DEFAULTED_DESCRIPTIONS[field] ?? prettyField(field)
                  : prettyField(field)
              )}
            />
          )}

          {/* Integrity checks — deterministic, recomputed per render. */}
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
              Integrity checks
            </p>
            {clean ? (
              <p className="text-xs text-secondary">
                No integrity issues found.
              </p>
            ) : (
              <ul className="space-y-1">
                <IntegrityLine
                  label="Duplicate task IDs"
                  taskIds={integrity.duplicates}
                />
                <IntegrityLine
                  label="Dates out of order"
                  taskIds={integrity.datesOutOfOrder}
                />
                <IntegrityLine
                  label="Completed date without Done status"
                  taskIds={integrity.completedButNotDone}
                />
                <IntegrityLine
                  label="Rows missing task name or status"
                  taskIds={integrity.missingCritical}
                />
              </ul>
            )}
          </div>

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

function IntegrityLine({
  label,
  taskIds,
}: {
  label: string;
  taskIds: string[];
}) {
  const count = taskIds.length;
  // Show first 5 task IDs inline so the popover stays a fixed size.
  const preview = taskIds.slice(0, 5).join(", ");
  const more = taskIds.length > 5 ? `, +${taskIds.length - 5} more` : "";
  return (
    <li className="text-xs">
      <span className={count > 0 ? "text-primary" : "text-secondary"}>
        {label}: {count}
      </span>
      {count > 0 && (
        <span className="text-muted font-mono ml-1">
          ({preview}
          {more})
        </span>
      )}
    </li>
  );
}

const DEFAULTED_DESCRIPTIONS: Partial<Record<CanonicalField, string>> = {
  task_id: "task IDs (auto-numbered)",
  task_name: "task name (we used the first text column)",
  status: "status (we used Unknown)",
  priority: "priority (we used Medium)",
};

function prettyField(f: CanonicalField): string {
  return f.replace(/_/g, " ");
}

function Section({
  label,
  count,
  items,
}: {
  label: string;
  count: number;
  items: string[];
}) {
  return (
    <div>
      <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
        {label} · {count}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-xs text-secondary">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
