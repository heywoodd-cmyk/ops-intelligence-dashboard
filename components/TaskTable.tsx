"use client";

import { ChevronDown, X } from "lucide-react";
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

  // Controlled UI state — lifted to page.tsx so the hero "View tasks"
  // button can drive open + filters in one shot.
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TaskTableFilters;
  onFiltersChange: (next: TaskTableFilters) => void;
}

const ROSE = "#f43f5e";

const STATUS_STYLES: Record<CanonicalStatus, string> = {
  Done: "bg-zinc-800/80 text-zinc-300 border-zinc-700",
  "In Progress": "bg-zinc-100/5 text-zinc-200 border-zinc-700",
  Blocked: "",
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

export function TaskTable({
  dataset,
  pinnedTaskId,
  onClearPin,
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: TaskTableProps) {
  const tasks = dataset.tasks;

  // Unique values for the filter dropdowns.
  const departments = uniqueSorted(
    tasks.map((t) => t.department).filter((d): d is string => !!d)
  );
  const assignees = uniqueSorted(
    tasks.map((t) => t.assignee).filter((a): a is string => !!a)
  );
  const statuses = STATUS_ORDER.filter((s) =>
    tasks.some((t) => t.status === s)
  );

  // Apply filters (AND logic). Pin overrides — when pinned, show only
  // the pinned task and hide the filter bar.
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
          {/* Filter bar — hidden when pinned (pin is more specific than filters) */}
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
              />
            )}

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
// FilterBar
// ---------------------------------------------------------------------

function FilterBar({
  dataset,
  departments,
  assignees,
  statuses,
  filters,
  onFiltersChange,
}: {
  dataset: NormalizedDataset;
  departments: string[];
  assignees: string[];
  statuses: CanonicalStatus[];
  filters: TaskTableFilters;
  onFiltersChange: (next: TaskTableFilters) => void;
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
      <button
        onClick={clear}
        disabled={!isDirty}
        className="text-xs text-muted hover:text-secondary disabled:opacity-30 disabled:cursor-default px-2.5 py-1.5 rounded-md hover:bg-card-border transition-colors"
      >
        Clear filters
      </button>
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
          {task.overdue && task.status !== "Blocked" && <OverduePill />}
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
