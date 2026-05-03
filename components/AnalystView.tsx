"use client";

import { Task, AnalysisResult } from "@/app/api/analyze/route";
import { Loader2 } from "lucide-react";

interface AnalystViewProps {
  tasks: Task[];
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

const HEALTH = {
  low: {
    label: "Operations Healthy",
    dot: "bg-emerald-400",
    color: "text-emerald-300",
    ring: "border-emerald-900/50",
    bg: "bg-emerald-950/30",
  },
  medium: {
    label: "Needs Attention",
    dot: "bg-amber-400",
    color: "text-amber-300",
    ring: "border-amber-900/50",
    bg: "bg-amber-950/30",
  },
  high: {
    label: "At Risk",
    dot: "bg-orange-400",
    color: "text-orange-300",
    ring: "border-orange-900/50",
    bg: "bg-orange-950/30",
  },
  critical: {
    label: "Critical — Immediate Action Needed",
    dot: "bg-red-400",
    color: "text-red-300",
    ring: "border-red-900/50",
    bg: "bg-red-950/30",
  },
};

export function AnalystView({ tasks, analysis, loading, error }: AnalystViewProps) {
  const today = new Date().toISOString().split("T")[0];

  const overdueTasks = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date < today &&
      t.status !== "Done" &&
      t.status !== "Completed"
  );
  const blockedTasks = tasks.filter((t) => t.status === "Blocked");
  const doneTasks = tasks.filter(
    (t) => t.status === "Done" || t.status === "Completed"
  );
  const completionRate =
    tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const attentionTasks = [
    ...blockedTasks,
    ...overdueTasks.filter((t) => t.status !== "Blocked"),
  ]
    .sort((a, b) => {
      const p: Record<string, number> = {
        Critical: 0,
        High: 1,
        Medium: 2,
        Low: 3,
      };
      return (p[a.priority] ?? 3) - (p[b.priority] ?? 3);
    })
    .slice(0, 8);

  const health = analysis ? HEALTH[analysis.riskLevel] : null;

  return (
    <div className="space-y-4">
      {/* Health summary */}
      {loading && (
        <div className="rounded-2xl border border-card-border bg-card p-8 flex items-center justify-center gap-3 text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Analyzing your operations…</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-5 text-red-300 text-sm">
          {error}
        </div>
      )}

      {analysis && health && !loading && (
        <div className={`rounded-2xl border ${health.ring} ${health.bg} p-6`}>
          <div className="flex items-center gap-2.5 mb-3">
            <span className={`w-2 h-2 rounded-full ${health.dot} animate-pulse`} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${health.color}`}>
              {health.label}
            </span>
          </div>
          <p className="text-[#dde3f0] text-base leading-relaxed font-light">
            {analysis.summary}
          </p>
        </div>
      )}

      {/* 3 quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <QuickStat
          label="Overdue"
          value={overdueTasks.length}
          active={overdueTasks.length > 0}
          activeClass="text-amber-300 bg-amber-950/30 border-amber-900/40"
        />
        <QuickStat
          label="Blocked"
          value={blockedTasks.length}
          active={blockedTasks.length > 0}
          activeClass="text-red-300 bg-red-950/30 border-red-900/40"
        />
        <QuickStat
          label="Complete"
          value={`${completionRate}%`}
          active={false}
          activeClass=""
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* What's blocking progress */}
        {analysis && !loading && (
          <div className="rounded-2xl border border-card-border bg-card p-5">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-4">
              What's blocking progress
            </h3>
            <ul className="space-y-3.5">
              {[...analysis.bottlenecks, ...analysis.overduePatterns]
                .slice(0, 4)
                .map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400/70 flex-shrink-0" />
                    <span className="text-[#b8c2d8] text-sm leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Recommended actions */}
        {analysis && !loading && (
          <div className="rounded-2xl border border-card-border bg-card p-5">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-4">
              What to do this week
            </h3>
            <ul className="space-y-3.5">
              {analysis.topRecommendations.map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-[11px] font-semibold text-violet-300">
                    {i + 1}
                  </span>
                  <span className="text-[#b8c2d8] text-sm leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tasks needing attention */}
      {attentionTasks.length > 0 && (
        <div className="rounded-2xl border border-card-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-card-border">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
              Tasks needing attention &middot; {attentionTasks.length}
            </h3>
          </div>
          <div className="divide-y divide-card-border">
            {attentionTasks.map((t) => {
              const isOverdue =
                t.due_date &&
                t.due_date < today &&
                t.status !== "Done" &&
                t.status !== "Completed";
              const isBlocked = t.status === "Blocked";
              return (
                <div
                  key={t.task_id}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#161b28] transition-colors"
                >
                  <span
                    className={`flex-shrink-0 w-2 h-2 rounded-full ${isBlocked ? "bg-red-400" : "bg-amber-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#d0d8ec] text-sm font-medium truncate">
                      {t.task_name}
                    </p>
                    <p className="text-muted text-xs mt-0.5">
                      {t.assignee} &middot; {t.department}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-xs font-medium ${
                        t.priority === "Critical"
                          ? "text-red-300"
                          : t.priority === "High"
                            ? "text-orange-300"
                            : "text-muted"
                      }`}
                    >
                      {t.priority}
                    </span>
                    {t.due_date && (
                      <span
                        className={`text-xs tabular-nums ${isOverdue ? "text-amber-300 font-medium" : "text-muted"}`}
                      >
                        {t.due_date}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({
  label,
  value,
  active,
  activeClass,
}: {
  label: string;
  value: string | number;
  active: boolean;
  activeClass: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center transition-colors ${
        active ? activeClass : "bg-card border-card-border"
      }`}
    >
      <p
        className={`text-2xl font-semibold ${active ? "" : "text-[#8b96b0]"}`}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted mt-1 uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}
