"use client";

import { ChevronDown, RotateCcw, Sparkles, X } from "lucide-react";
import type {
  CanonicalStatus,
  NormalizedDataset,
  Task,
} from "@/lib/schema";

export interface TaskTableFilters {
  department: string; // "All" or a department name
  assignee: string;   // "All" or an assignee name
  status: string;     // "All" or a CanonicalStatus
}

export const EMPTY_FILTERS: TaskTableFilters = {
  department: "All",
  assignee: "All",
  status: "All",
};

interface TaskTableProps {
  dataset: NormalizedDataset;
  pinnedTaskId?: string | null;
  onClearPin?: () => void;

  // Controlled UI state — lifted to page.tsx.
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TaskTableFilters;
  onFiltersChange: (next: TaskTableFilters) => void;

  // Editable-status integration.
  onStatusChange: (taskId: string, newStatus: CanonicalStatus) => void;
  modifiedTaskIds: Set<string>;
  canReset: boolean;
  onReset: () => void;
}

const ROSE = "#f43f5e";
const VIOLET = "#8b5cf6";

const STATUS_STYLES: Record<CanonicalStatus, string> = {
  Done: "bg-zinc-800/80 text-zinc-300 border-zinc-700",
  "In Progress": "bg-zinc-100/5 text-zinc-200 border-zinc-700",
  Blocked: "", // inline rose styling applied below
  "Not Started": "bg-zinc-900 text-zinc-500 border-zinc-800",
  Unknown: "bg-zinc-900 text-zinc-600 border-zinc-800 italic",
};

const STATUS_ORDER: CanonicalStatus[] = [
  "Done",
  "In Progress",
  "Blocked",
  "Not Started",
  "Unknown",
];

const EDITABLE_OPTIONS: CanonicalStatus[] = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Done",
];

export function TaskTable({
  dataset,
  pinnedTaskId,
  onClearPin,
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onStatusChange,
  modifiedTaskIds,
  canReset,
  onReset,
}: TaskTableProps) {
  const tasks = dataset.tasks;

  const departments = uniqueSorted(
    tasks.map((t) => t.department).filter((d): d is string => !!d)
  );
  const assignees = uniqueSorted(
    tasks.map((t) => t.assignee).filter((a): a is string => !!a)
  );
  const statuses = STATUS_ORDER.filter((s) =>
    tasks.some((t) => t.status === s)
  );

  const visible = pinnedTaskId
    ? tasks.filter((t) => t.task_id === pinnedTaskId)
    : tasks.filter((t) => matchesFilters(t, filters));

  const hasActiveFilter =
    filters.department !== "All" ||
    filters.assignee !== "All" ||
    filters.status !== "All";

  const summaryLabel = pinnedTaskId
    ? `Pinned to ${pinnedTaskId}`
    : hasActiveFilter
      ? `Showing ${visible.length} of ${tasks.length} tasks`
      : `Show all ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  return (
    <section id="task-table">
      <details
        open={open}
        onToggle={(e) =>
          onOpenChange((e.currentTarget as HTMLDetailsElement).open)
        }
        className="card-surface rounded-md overflow-hidden"
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

        <div className="border-t border-card-border">
          {/* Try-it hint — discoverability cue for the editable status feature.
              Hidden when pinned (filter bar also hidden then). */}
          {!pinnedTaskId && (
            <div className="px-6 py-3 border-b border-card-border flex items-center gap-2 text-sm text-secondary">
              <Sparkles
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: VIOLET }}
              />
              <span>
                Try it: click any status to see how the metrics react.
              </span>
            </div>
          )}

          {/* Filter bar — hidden when pinned. */}
          {!pinnedTaskId &&
            (dataset.hasDepartment ||
              dataset.hasAssignee ||
              dataset.hasStatus) && (
              <FilterBar
                dataset={dataset}
                departments={departments}
                assignees={assignees}
                statuses={statuses}
                filters={filters}
                onFiltersChange={onFiltersChange}
                canReset={canReset}
                onReset={onReset}
              />
            )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  {/* Leading column for the modified-row dot (no header label) */}
                  <th
                    aria-hidden
                    className="w-4 px-2 py-3"
                  />
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
                    modified={modifiedTaskIds.has(t.task_id)}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div className="py-12 text-center text-muted text-sm">
                {pinnedTaskId
                  ? `Task ${pinnedTaskId} not found.`
                  : hasActiveFilter
                    ? "No tasks match the current filters."
                    : "No tasks loaded."}
              </div>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}

// ---------------------------------------------------------------------
// FilterBar (now also hosts the "Reset to original" button)
// ---------------------------------------------------------------------

function FilterBar({
  dataset,
  departments,
  assignees,
  statuses,
  filters,
  onFiltersChange,
  canReset,
  onReset,
}: {
  dataset: NormalizedDataset;
  departments: string[];
  assignees: string[];
  statuses: CanonicalStatus[];
  filters: TaskTableFilters;
  onFiltersChange: (next: TaskTableFilters) => void;
  canReset: boolean;
  onReset: () => void;
}) {
  const showDept = dataset.hasDepartment && departments.length > 0;
  const showAssignee = dataset.hasAssignee && assignees.length > 0;
  const showStatus = dataset.hasStatus && statuses.length > 0;

  if (!showDept && !showAssignee && !showStatus) return null;

  const isDirty =
    filters.department !== "All" ||
    filters.assignee !== "All" ||
    filters.status !== "All";

  const clear = () => onFiltersChange(EMPTY_FILTERS);
  const set = (key: keyof TaskTableFilters, value: string) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="px-6 py-4 border-b border-card-border flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap text-sm">
        {showDept && (
          <FilterSelect
            label="Department"
            value={filters.department}
            options={departments}
            onChange={(v) => set("department", v)}
          />
        )}
        {showAssignee && (
          <FilterSelect
            label="Assignee"
            value={filters.assignee}
            options={assignees}
            onChange={(v) => set("assignee", v)}
          />
        )}
        {showStatus && (
          <FilterSelect
            label="Status"
            value={filters.status}
            options={statuses}
            onChange={(v) => set("status", v)}
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={clear}
          disabled={!isDirty}
          className="text-xs px-2.5 py-1.5 rounded-md transition-colors cursor-pointer
                     text-zinc-200 hover:text-zinc-50 hover:bg-[#1f1f23]
                     disabled:cursor-default disabled:text-zinc-600
                     disabled:hover:bg-transparent disabled:hover:text-zinc-600"
        >
          Clear filters
        </button>
        <button
          onClick={onReset}
          disabled={!canReset}
          title="Discard all status edits and restore the originally loaded data"
          className="text-xs px-2.5 py-1.5 rounded-md transition-colors cursor-pointer
                     flex items-center gap-1.5
                     text-zinc-200 hover:text-zinc-50 hover:bg-[#1f1f23]
                     disabled:cursor-default disabled:text-zinc-600
                     disabled:hover:bg-transparent disabled:hover:text-zinc-600"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to original
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] text-muted uppercase tracking-widest">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs text-secondary bg-zinc-900 border border-card-border rounded px-2 py-1 hover:border-zinc-700 focus:outline-none focus:border-violet-500/60 transition-colors cursor-pointer"
      >
        <option value="All">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------

function Row({
  task,
  pinned,
  modified,
  onStatusChange,
}: {
  task: Task;
  pinned: boolean;
  modified: boolean;
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
    <tr
      className={`border-b border-card-border/60 hover:bg-zinc-900/50 transition-colors ${
        pinned ? "bg-zinc-800/30" : ""
      }`}
    >
      {/* Modified-row dot column */}
      <td className="w-4 px-2 py-3">
        {modified && (
          <span
            className="block w-1.5 h-1.5 rounded-full mx-auto"
            style={{ backgroundColor: VIOLET }}
            aria-label="Status edited from original"
          />
        )}
      </td>
      <td className="px-4 py-3 text-muted font-mono text-xs">
        {task.task_id}
      </td>
      <td className="px-4 py-3 text-primary max-w-[280px] truncate">
        {task.task_name}
      </td>
      <td className="px-4 py-3 text-secondary">{task.assignee ?? "—"}</td>
      <td className="px-4 py-3">
        <EditableStatusCell task={task} onStatusChange={onStatusChange} />
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

// ---------------------------------------------------------------------
// EditableStatusCell — hidden <select> overlaid on the visible pill,
// so the existing pill design stays intact and we get native dropdown
// UX (keyboard, escape-to-close) for free.
// ---------------------------------------------------------------------

function EditableStatusCell({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: CanonicalStatus) => void;
}) {
  return (
    <div className="relative inline-flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-0.5 hover:bg-zinc-800/40 focus-within:ring-2 focus-within:ring-violet-500/40 transition-colors">
      <StatusPill status={task.status} />
      {task.overdue && task.status !== "Blocked" && <OverduePill />}
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

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function matchesFilters(task: Task, filters: TaskTableFilters): boolean {
  if (
    filters.department !== "All" &&
    task.department !== filters.department
  )
    return false;
  if (filters.assignee !== "All" && task.assignee !== filters.assignee)
    return false;
  if (filters.status !== "All" && task.status !== filters.status)
    return false;
  return true;
}
