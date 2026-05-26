"use client";

import { ValidationReport } from "@/lib/schema";
import { ArrowRight, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";

interface ValidationSummaryProps {
  report: ValidationReport;
  onContinue: () => void;
  onRemap: () => void;
}

export function ValidationSummary({
  report,
  onContinue,
  onRemap,
}: ValidationSummaryProps) {
  const allClean = report.flagged === 0 && report.dropped === 0;

  return (
    <main className="min-h-screen bg-page">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-[#d0d8ec]">
            Validation summary
          </h1>
          <p className="text-muted text-sm mt-1">
            Here&apos;s what we found after applying your mapping. Nothing was
            silently dropped.
          </p>
        </header>

        {/* Top-line counts */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat
            label="Rows received"
            value={report.total}
            color="text-[#8b96b0]"
          />
          <Stat
            label="Valid"
            value={report.valid}
            color="text-emerald-300"
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          />
          <Stat
            label="Dropped / flagged"
            value={`${report.dropped} / ${report.flagged}`}
            color={
              report.dropped > 0 || report.flagged > 0
                ? "text-amber-300"
                : "text-[#8b96b0]"
            }
            icon={
              report.dropped + report.flagged > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : undefined
            }
          />
        </div>

        {/* Issues list */}
        {report.issues.length > 0 ? (
          <section className="rounded-2xl border border-card-border bg-card overflow-hidden mb-6">
            <div className="px-5 py-3.5 border-b border-card-border">
              <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
                Issues &middot; {report.issues.length}
              </h3>
            </div>
            <div className="divide-y divide-card-border max-h-80 overflow-y-auto">
              {report.issues.map((issue, i) => (
                <div
                  key={i}
                  className="px-5 py-3 flex items-start gap-3 text-sm"
                >
                  <span
                    className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                      issue.dropped ? "bg-red-400" : "bg-amber-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#d0d8ec] text-sm font-mono">
                        {issue.taskId || `Row ${issue.rowIndex + 1}`}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          issue.dropped
                            ? "bg-red-950/40 text-red-300 border border-red-900/40"
                            : "bg-amber-950/40 text-amber-300 border border-amber-900/40"
                        }`}
                      >
                        {issue.dropped ? "Dropped" : "Flagged (kept)"}
                      </span>
                    </div>
                    <p className="text-muted text-xs mt-1">
                      {issue.reasons.join(" · ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-5 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-emerald-200 text-sm">
              All {report.total} rows passed validation cleanly.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onRemap}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-card-border text-muted hover:text-[#a8b4cc] text-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Adjust mapping
          </button>
          <button
            onClick={onContinue}
            disabled={report.valid === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {allClean
              ? `Continue with ${report.valid} tasks`
              : `Continue with ${report.valid} valid tasks`}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted font-medium uppercase tracking-widest">
          {label}
        </span>
        {icon && <span className={color}>{icon}</span>}
      </div>
      <span className={`text-2xl font-semibold ${color}`}>{value}</span>
    </div>
  );
}
