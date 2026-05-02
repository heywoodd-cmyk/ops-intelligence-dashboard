"use client";

import { Task } from "@/app/api/analyze/route";
import { useState } from "react";

interface TaskTableProps {
  tasks: Task[];
}

const STATUS_STYLES: Record<string, string> = {
  Done: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  "In Progress": "bg-blue-900/40 text-blue-300 border-blue-700/40",
  Blocked: "bg-red-900/40 text-red-300 border-red-700/40",
  Overdue: "bg-amber-900/40 text-amber-300 border-amber-700/40",
  "Not Started": "bg-slate-700/40 text-slate-400 border-slate-600/40",
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "text-red-400",
  High: "text-orange-400",
  Medium: "text-amber-400",
  Low: "text-slate-500",
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

  const filtered =
    filter === "All"
      ? tasks
      : tasks.filter((t) => getDisplayStatus(t) === filter);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          All Tasks
        </h3>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
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
            <tr className="border-b border-slate-700">
              {["ID", "Task", "Assignee", "Status", "Priority", "Due Date", "Dept"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium uppercase tracking-wide"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const displayStatus = getDisplayStatus(t);
              const isOverdue = displayStatus === "Overdue";
              return (
                <tr
                  key={t.task_id}
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    isOverdue ? "bg-amber-900/5" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">
                    {t.task_id}
                  </td>
                  <td className="px-4 py-2.5 text-slate-200 max-w-[240px] truncate">
                    {t.task_name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{t.assignee}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${
                        STATUS_STYLES[displayStatus] || STATUS_STYLES["Not Started"]
                      }`}
                    >
                      {displayStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium ${
                        PRIORITY_STYLES[t.priority] || "text-slate-400"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-2.5 text-xs ${
                      isOverdue ? "text-amber-400 font-medium" : "text-slate-500"
                    }`}
                  >
                    {t.due_date || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {t.department}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            No tasks match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
