"use client";

import { Task } from "@/app/api/analyze/route";
import { useState } from "react";

interface TaskTableProps {
  tasks: Task[];
}

const STATUS_STYLES: Record<string, string> = {
  Done: "bg-emerald-950/40 text-emerald-300 border-emerald-900/40",
  "In Progress": "bg-blue-950/40 text-blue-300 border-blue-900/40",
  Blocked: "bg-red-950/40 text-red-300 border-red-900/40",
  Overdue: "bg-amber-950/40 text-amber-300 border-amber-900/40",
  "Not Started": "bg-[#161b2a] text-[#6b778f] border-[#1c2235]",
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "text-red-300",
  High: "text-orange-300",
  Medium: "text-amber-300",
  Low: "text-[#6b778f]",
};

export function TaskTable({ tasks }: TaskTableProps) {
  const today = new Date().toISOString().split("T")[0];
  const [filter, setFilter] = useState<string>("All");

  const getDisplayStatus = (t: Task): string => {
    if (
      t.due_date &&
      t.due_date < today &&
      t.status !== "Done" &&
      t.status !== "Completed"
    )
      return "Overdue";
    return t.status;
  };

  const filters = ["All", "Overdue", "Blocked", "In Progress", "Not Started", "Done"];
  const filtered = filter === "All" ? tasks : tasks.filter((t) => getDisplayStatus(t) === filter);

  return (
    <div className="rounded-xl border border-card-border bg-card overflow-hidden">
      <div className="p-4 border-b border-card-border flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
          All Tasks
        </h3>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
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
              {["ID", "Task", "Assignee", "Status", "Priority", "Due Date", "Dept"].map((h) => (
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
              const displayStatus = getDisplayStatus(t);
              const isOverdue = displayStatus === "Overdue";
              return (
                <tr
                  key={t.task_id}
                  className={`border-b border-[#1c2235]/60 hover:bg-[#161b2a] transition-colors ${
                    isOverdue ? "bg-amber-950/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-muted font-mono text-xs">{t.task_id}</td>
                  <td className="px-4 py-3 text-[#c8d2e8] max-w-[240px] truncate">{t.task_name}</td>
                  <td className="px-4 py-3 text-[#8b96b0]">{t.assignee}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${STATUS_STYLES[displayStatus] || STATUS_STYLES["Not Started"]}`}>
                      {displayStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${PRIORITY_STYLES[t.priority] || "text-muted"}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs tabular-nums ${isOverdue ? "text-amber-300 font-medium" : "text-muted"}`}>
                    {t.due_date || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{t.department}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted text-sm">No tasks match this filter.</div>
        )}
      </div>
    </div>
  );
}
