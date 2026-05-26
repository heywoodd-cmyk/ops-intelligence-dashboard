"use client";

import { Task } from "@/app/api/analyze/route";
import { useState } from "react";
import { X } from "lucide-react";

interface TaskTableProps {
  tasks: Task[];
  pinnedTaskId?: string | null;
  onClearPin?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  Done: "bg-emerald-950/40 text-emerald-300 border-emerald-900/40",
  "In Progress": "bg-blue-950/40 text-blue-300 border-blue-900/40",
  Blocked: "bg-red-950/40 text-red-300 border-red-900/40",
  Overdue: "bg-amber-950/40 text-amber-300 border-amber-900/40", // legacy raw value
  "Not Started": "bg-[#161b2a] text-[#6b778f] border-[#1c2235]",
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "text-red-300",
  High: "text-orange-300",
  Medium: "text-amber-300",
  Low: "text-[#6b778f]",
};

export function TaskTable({ tasks, pinnedTaskId, onClearPin }: TaskTableProps) {
  const today = new Date().toISOString().split("T")[0];
  const [filter, setFilter] = useState<string>("All");

  // Overdue is a FLAG (independent of status), not a status value.
  // Matches the definition used by MetricsGrid and route.ts computeFacts.
  const isOverdueFlag = (t: Task): boolean =>
    !!t.due_date &&
    t.due_date < today &&
    t.status !== "Done" &&
    t.status !== "Completed";

  // Each filter has its own predicate — Blocked and Overdue are independent.
  // A task that is both Blocked and overdue matches BOTH filters.
  const FILTER_PREDICATES: Record<string, (t: Task) => boolean> = {
    All: () => true,
    Overdue: isOverdueFlag,
    Blocked: (t) => t.status === "Blocked",
    "In Progress": (t) => t.status === "In Progress",
    "Not Started": (t) => t.status === "Not Started",
    Done: (t) => t.status === "Done" || t.status === "Completed",
  };

  const filters = [
    "All",
    "Overdue",
    "Blocked",
    "In Progress",
    "Not Started",
    "Done",
  ];

  // Pinned task overrides the status filter.
  const filtered = pinnedTaskId
    ? tasks.filter((t) => t.task_id === pinnedTaskId)
    : tasks.filter(FILTER_PREDICATES[filter] || (() => true));

  return (
    <div
      id="task-table"
      className="rounded-xl border border-card-border bg-card overflow-hidden"
    >
      <div className="p-4 border-b border-card-border flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
          All Tasks
        </h3>

        <div className="flex gap-1.5 flex-wrap items-center">
          {pinnedTaskId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-950/60 border border-violet-800/50 text-violet-300 text-xs font-mono">
              {pinnedTaskId}
              <button
                onClick={onClearPin}
                className="hover:text-white transition-colors ml-0.5"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {!pinnedTaskId &&
            filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-violet-600/80 text-white"
                    : "bg-[#161b2a] text-[#6b778f] hover:text-[#a8b4cc] hover:bg-[#1c2235]"
                }`}
              >
                {f}
              </button>
            ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              {[
                "ID",
                "Task",
                "Assignee",
                "Status",
                "Priority",
                "Due Date",
                "Dept",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-[10px] text-muted font-semibold uppercase tracking-widest"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const overdue = isOverdueFlag(t);
              const isPinned = t.task_id === pinnedTaskId;
              // Show "Overdue" flag pill EXCEPT when the raw status is literally
              // "Overdue" (avoid duplicate label for legacy/non-canonical data).
              const showOverduePill = overdue && t.status !== "Overdue";
              return (
                <tr
                  key={t.task_id}
                  className={`border-b border-[#1c2235]/60 hover:bg-[#161b2a] transition-colors ${
                    isPinned
                      ? "bg-violet-950/10 ring-1 ring-inset ring-violet-900/30"
                      : overdue
                        ? "bg-amber-950/5"
                        : ""
                  }`}
                >
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {t.task_id}
                  </td>
                  <td className="px-4 py-3 text-[#c8d2e8] max-w-[240px] truncate">
                    {t.task_name}
                  </td>
                  <td className="px-4 py-3 text-[#8b96b0]">{t.assignee}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${STATUS_STYLES[t.status] || STATUS_STYLES["Not Started"]}`}
                      >
                        {t.status}
                      </span>
                      {showOverduePill && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-medium bg-amber-950/40 text-amber-300 border-amber-900/40">
                          Overdue
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${PRIORITY_STYLES[t.priority] || "text-muted"}`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-xs tabular-nums ${overdue ? "text-amber-300 font-medium" : "text-muted"}`}
                  >
                    {t.due_date || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {t.department}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted text-sm">
            {pinnedTaskId
              ? `Task ${pinnedTaskId} not found in this dataset.`
              : "No tasks match this filter."}
          </div>
        )}
      </div>
    </div>
  );
}
