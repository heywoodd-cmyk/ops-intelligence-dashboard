"use client";

import { useState } from "react";
import {
  CANONICAL_FIELDS,
  CANONICAL_STATUSES,
  REQUIRED_FIELDS,
  CanonicalField,
  CanonicalStatus,
  ProposedMapping,
} from "@/lib/schema";
import { AlertTriangle, ArrowRight, Sparkles, X } from "lucide-react";

interface SchemaMapperProps {
  rawHeaders: string[];
  rawStatusValues: string[];
  proposedMapping: ProposedMapping | null;
  mappingError?: string | null;
  onConfirm: (mapping: ProposedMapping) => void;
  onCancel: () => void;
}

export function SchemaMapper({
  rawHeaders,
  rawStatusValues,
  proposedMapping,
  mappingError,
  onConfirm,
  onCancel,
}: SchemaMapperProps) {
  // Initialise column_map from AI proposal (if available); user can override.
  const [columnMap, setColumnMap] = useState<
    Record<CanonicalField, string | null>
  >(() => {
    const init = {} as Record<CanonicalField, string | null>;
    CANONICAL_FIELDS.forEach((f) => {
      const p = proposedMapping?.column_map?.[f];
      init[f] = p && rawHeaders.includes(p) ? p : null;
    });
    return init;
  });

  const [statusValueMap, setStatusValueMap] = useState<
    Record<string, CanonicalStatus | null>
  >(() => {
    const init: Record<string, CanonicalStatus | null> = {};
    rawStatusValues.forEach((v) => {
      const p = proposedMapping?.status_value_map?.[v];
      init[v] =
        p && (CANONICAL_STATUSES as readonly string[]).includes(p)
          ? (p as CanonicalStatus)
          : null;
    });
    return init;
  });

  const missingRequired = REQUIRED_FIELDS.filter((f) => !columnMap[f]);
  const canConfirm = missingRequired.length === 0;

  const setColumn = (field: CanonicalField, value: string) =>
    setColumnMap((prev) => ({ ...prev, [field]: value || null }));

  const setStatusValue = (raw: string, value: string) =>
    setStatusValueMap((prev) => ({
      ...prev,
      [raw]: (value as CanonicalStatus) || null,
    }));

  return (
    <main className="min-h-screen bg-page">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <header className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-950/50 border border-violet-900/40 text-violet-300 text-[10px] font-medium mb-3">
            <Sparkles className="w-2.5 h-2.5" />
            CSV Schema Mapping
          </div>
          <h1 className="text-xl font-semibold text-[#d0d8ec]">
            Match your CSV to the dashboard
          </h1>
          <p className="text-muted text-sm mt-1">
            Your CSV doesn&apos;t exactly match our expected columns. Confirm the
            mappings below — nothing loads until you click Confirm.
          </p>
        </header>

        {mappingError && (
          <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 text-sm font-medium">
                AI mapping unavailable
              </p>
              <p className="text-amber-200/70 text-xs mt-0.5">
                Set the mappings manually below — the dashboard works either
                way.
              </p>
            </div>
          </div>
        )}

        {/* Column mapping */}
        <section className="rounded-2xl border border-card-border bg-card p-5 mb-4">
          <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-4">
            Column mapping
          </h2>
          <div className="space-y-2.5">
            {CANONICAL_FIELDS.map((field) => {
              const required = REQUIRED_FIELDS.includes(field);
              const value = columnMap[field] ?? "";
              const wasAISuggested =
                !!proposedMapping?.column_map?.[field] &&
                proposedMapping.column_map[field] === value;
              return (
                <div
                  key={field}
                  className="grid grid-cols-[1fr_auto_1.4fr_auto] gap-3 items-center"
                >
                  <label className="text-sm text-[#c8d2e8] font-mono">
                    {field}
                    {required && (
                      <span className="text-red-400 ml-0.5">*</span>
                    )}
                  </label>
                  <ArrowRight className="w-3.5 h-3.5 text-muted" />
                  <select
                    value={value}
                    onChange={(e) => setColumn(field, e.target.value)}
                    className={`bg-[#161b2a] border rounded-lg px-3 py-2 text-sm text-[#d0d8ec] focus:outline-none focus:ring-1 focus:ring-violet-500 ${
                      required && !value
                        ? "border-red-900/40"
                        : "border-card-border"
                    }`}
                  >
                    <option value="">— skip —</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {wasAISuggested ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-violet-400/80 uppercase tracking-wider">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI
                    </span>
                  ) : (
                    <span className="w-6" />
                  )}
                </div>
              );
            })}
          </div>
          {missingRequired.length > 0 && (
            <p className="mt-4 text-xs text-red-300/80">
              Required:{" "}
              {missingRequired.map((f) => (
                <code
                  key={f}
                  className="font-mono bg-red-950/40 px-1.5 py-0.5 rounded mx-0.5"
                >
                  {f}
                </code>
              ))}
            </p>
          )}
        </section>

        {/* Status value mapping */}
        {rawStatusValues.length > 0 && (
          <section className="rounded-2xl border border-card-border bg-card p-5 mb-6">
            <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">
              Status value mapping
            </h2>
            <p className="text-xs text-muted mb-4">
              Map the status values found in your CSV to one of the four
              canonical statuses. Unmapped values cause rows to be flagged.
            </p>
            <div className="space-y-2.5">
              {rawStatusValues.map((raw) => {
                const value = statusValueMap[raw] ?? "";
                const wasAISuggested =
                  !!proposedMapping?.status_value_map?.[raw] &&
                  proposedMapping.status_value_map[raw] === value;
                return (
                  <div
                    key={raw}
                    className="grid grid-cols-[1fr_auto_1.4fr_auto] gap-3 items-center"
                  >
                    <span className="text-sm text-[#c8d2e8] font-mono truncate">
                      &quot;{raw}&quot;
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted" />
                    <select
                      value={value}
                      onChange={(e) => setStatusValue(raw, e.target.value)}
                      className="bg-[#161b2a] border border-card-border rounded-lg px-3 py-2 text-sm text-[#d0d8ec] focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="">— skip (rows flagged) —</option>
                      {CANONICAL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {wasAISuggested ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-violet-400/80 uppercase tracking-wider">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                      </span>
                    ) : (
                      <span className="w-6" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-card-border text-muted hover:text-[#a8b4cc] text-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm({
                column_map: columnMap,
                status_value_map: statusValueMap,
              })
            }
            disabled={!canConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm and continue
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </main>
  );
}
