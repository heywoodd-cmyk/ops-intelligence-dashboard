"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { CanonicalStatus, NormalizedDataset, Task } from "@/lib/schema";

interface TaskTableProps {
  dataset: NormalizedDataset;
  pinnedTaskId?: string | null;
  onClearPin?: () => void;
}

const ROSE = "#f43f5e";

const STATUS_STYLES: Record<CanonicalStatus, string> = {
  Done: "bg-zinc-800/80 text-zinc-300 border-zinc-700",
  "In Progress": "bg-zinc-100/5 text-zinc-200 border-zinc-700",
  Blocked: "", // rose styling applied inline so it stays on-budget
  "Not Started": "bg-zinc-900 text-zinc-500 border-zinc-800",
  Unknown: "bg-zinc-900 text-zinc-600 border-zinc-800 italic",
};

/**
 * Full task list, wrapped in <details>. Closed by default; auto-opens
 * when a task is pinned from the AttentionList.
 *
 * No status filter chips here — the AttentionList does curation; this
 * table is for browse-everything when expanded.
 */
export function TaskTable({
  dataset,
  pinnedTaskId,
  onClearPin,
}: TaskTableProps) {
  const tasks = dataset.tasks;
  const [open, setOpen] = useState(false);

  // Auto-open the details element when a task is pinned from elsewhere.
  useEffect(() => {
    if (pinnedTaskId) setOpen(true);
  }, [pinnedTaskId]);

  const visible = pinnedTaskId
    ? tasks.filter((t) => t.task_id === pinnedTaskId)
    : tasks;

  const summaryLabel = pinnedTaskId
    ? `Pinned to ${pinnedTaskId}`
    : `Show all ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  return (
    <section id="task-table">
      <details
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="bg-card border border-card-border rounded-md overflow-hidden"
      >
        <summary className="px-6 py-4 cursor-pointer list-none flex items-center justify-between text-sm text-secondary hover:text-primary transition-colors">
          <span className="flex items-center gap-3">
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
            {summaryLabel}
          </span>

          {pinnedTaskId && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClearPin?.();
              }}
              className="text-xs text-muted hover:text-primary flex items-center gap-1 px-2 py-1 rounded hover:bg-card-border transition-colors"
            >
              <X className="w-3 h-3" />
              Clear pin
            </button>
          )}
        </summary>

        <div className="overflow-x-auto border-t border-card-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                {[
                  "ID",
                  "Task",
                  "Assignee",
                  "Status",
                  "Priority",
                  "Due date",
                  "Department",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[10px] text-muted uppercase tracking-widest font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <Row
                  key={t.task_id}
                  task={t}
                  pinned={t.task_id === pinnedTaskId}
                />
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="py-12 text-center text-muted text-sm">
              {pinnedTaskId
                ? `Task ${pinnedTaskId} not found.`
                : "No tasks loaded."}
            </div>
          )}
        </div>
      </details>
    </section>
  );
}

function Row({ task, pinned }: { task: Task; pinned: boolean }) {
  const dueLabel = task.due_date
    ? task.due_date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <tr
      className={`border-b border-card-border/60 hover:bg-zinc-900/50 transition-colors ${
        pinned ? "bg-zinc-800/30" : ""
      }`}
    >
      <td className="px-4 py-3 text-muted font-mono text-xs">
        {task.task_id}
      </td>
      <td className="px-4 py-3 text-primary max-w-[280px] truncate">
        {task.task_name}
      </td>
      <td className="px-4 py-3 text-secondary">{task.assignee ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusPill status={task.status} />
          {task.overdue && task.status !== "Blocked" && (
            <OverduePill />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-secondary">{task.priority}</td>
      <td
        className={`px-4 py-3 text-xs tabular-nums ${
          task.overdue ? "text-primary font-medium" : "text-muted"
        }`}
      >
        {dueLabel}
      </td>
      <td className="px-4 py-3 text-muted text-xs">
        {task.department ?? "—"}
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: CanonicalStatus }) {
  if (status === "Blocked") {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium"
        style={{
          backgroundColor: "rgba(244, 63, 94, 0.12)",
          color: "#fda4af",
          borderColor: "rgba(244, 63, 94, 0.3)",
        }}
      >
        Blocked
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function OverduePill() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-medium"
      style={{
        backgroundColor: "rgba(244, 63, 94, 0.08)",
        color: "#fda4af",
        borderColor: "rgba(244, 63, 94, 0.25)",
      }}
    >
      Overdue
    </span>
  );
}
