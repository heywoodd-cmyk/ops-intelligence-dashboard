"use client";

import { useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import type {
  CanonicalStatus,
  NormalizedDataset,
  Task,
} from "@/lib/schema";

export type KpiDrillKind = "overdue" | "blocked" | "completed";

interface KpiDrillModalProps {
  open: boolean;
  kind: KpiDrillKind | null;
  dataset: NormalizedDataset;
  onStatusChange: (taskId: string, newStatus: CanonicalStatus) => void;
  onClose: () => void;
}

/**
 * Receipts modal. Click a KPI tile to see the exact rows behind the
 * number, with the matching rule stated in plain language. Status is
 * editable here too — edits live-update the visible set so the user
 * watches the counts move.
 *
 * Same overlay + animation pattern as DraftActionModal. ESC and
 * click-outside close. The X is always visible top-right.
 */
export function KpiDrillModal({
  open,
  kind,
  dataset,
  onStatusChange,
  onClose,
}: KpiDrillModalProps) {
  if (!open || !kind) return null;
  return (
    <KpiDrillContent
      kind={kind}
      dataset={dataset}
      onStatusChange={onStatusChange}
      onClose={onClose}
    />
  );
}

interface DrillConfig {
  predicate: (t: Task) => boolean;
  title: (count: number) => string;
  rule: (count: number, total: number) => string;
}

const CONFIG: Record<KpiDrillKind, DrillConfig> = {
  overdue: {
    predicate: (t) => t.overdue,
    title: (n) => `${n} overdue ${n === 1 ? "task" : "tasks"}`,
    rule: (n, total) =>
      `Overdue = due date has passed and status is not Done. ${n} of ${total} rows.`,
  },
  blocked: {
    predicate: (t) => t.status === "Blocked",
    title: (n) => `${n} blocked ${n === 1 ? "task" : "tasks"}`,
    rule: (n, total) =>
      `Blocked = status set to Blocked. ${n} of ${total} rows.`,
  },
  completed: {
    predicate: (t) => t.status === "Done",
    title: (n) => `${n} completed ${n === 1 ? "task" : "tasks"}`,
    rule: (n, total) =>
      `Completed = status set to Done. ${n} of ${total} rows.`,
  },
};

function KpiDrillContent({
  kind,
  dataset,
  onStatusChange,
  onClose,
}: Omit<KpiDrillModalProps, "open"> & { kind: KpiDrillKind }) {
  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cfg = CONFIG[kind];
  const matching = dataset.tasks.filter(cfg.predicate);
  const count = matching.length;
  const total = dataset.rowCount;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={cfg.title(count)}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(10, 10, 12, 0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-surface rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col animate-modal-in relative overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-md transition-colors cursor-pointer
                     text-zinc-400 hover:text-zinc-50 hover:bg-[#1f1f23] z-10"
        >
          <X className="w-[18px] h-[18px]" />
        </button>

        {/* Header */}
        <div className="px-6 py-5 border-b border-card-border flex-shrink-0 pr-14">
          <h2 className="text-lg font-semibold text-primary mb-1">
            {cfg.title(count)}
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            {cfg.rule(count, total)}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-auto">
          {matching.length === 0 ? (
            <div className="py-12 text-center text-muted text-sm">
              No rows match the rule above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#131316] z-[1]">
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
                {matching.map((t) => (
                  <DrillRow
                    key={t.task_id}
                    task={t}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Row — visually matches TaskTable's row so the user sees the same
// shape they expect. Intentionally inlined here to keep the modal
// self-contained.
// ---------------------------------------------------------------------

const STATUS_STYLES: Record<CanonicalStatus, string> = {
  Done: "bg-zinc-800/80 text-zinc-300 border-zinc-700",
  "In Progress": "bg-zinc-100/5 text-zinc-200 border-zinc-700",
  Blocked: "",
  "Not Started": "bg-zinc-900 text-zinc-500 border-zinc-800",
  Unknown: "bg-zinc-900 text-zinc-600 border-zinc-800 italic",
};

const EDITABLE_OPTIONS: CanonicalStatus[] = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Done",
];

function DrillRow({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: CanonicalStatus) => void;
}) {
  const dueLabel = task.due_date
    ? task.due_date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <tr className="border-b border-card-border/60 hover:bg-zinc-900/50 transition-colors">
      <td className="px-4 py-3 text-muted font-mono text-xs">
        {task.task_id}
      </td>
      <td className="px-4 py-3 text-primary max-w-[260px] truncate">
        {task.task_name}
      </td>
      <td className="px-4 py-3 text-secondary">{task.assignee ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="relative inline-flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-0.5 hover:bg-zinc-800/40 focus-within:ring-2 focus-within:ring-violet-500/40 transition-colors">
          {task.status === "Blocked" ? (
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
          ) : (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${STATUS_STYLES[task.status]}`}
            >
              {task.status}
            </span>
          )}
          {task.overdue && task.status !== "Blocked" && (
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
          )}
          <ChevronDown className="w-3 h-3 text-muted" aria-hidden />
          <select
            value={task.status}
            onChange={(e) =>
              onStatusChange(task.task_id, e.target.value as CanonicalStatus)
            }
            aria-label={`Change status for ${task.task_id}`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {task.status === "Unknown" && (
              <option value="Unknown" disabled>
                Unknown (current)
              </option>
            )}
            {EDITABLE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
