"use client";

import { ChevronDown } from "lucide-react";
import { attentionRows, type AttentionRow } from "@/lib/urgency";
import { recommendAction } from "@/lib/recommendations";
import type { NormalizedDataset, Task } from "@/lib/schema";
import type { ActionType } from "@/components/DraftActionModal";

interface AttentionListProps {
  dataset: NormalizedDataset;
  onTaskClick?: (id: string) => void;
  /** Standup row's "Generate" button — open the draft-action modal. */
  onOpenModal?: (params: {
    actionType: ActionType;
    department?: string;
    assignee?: string;
  }) => void;
}

const ROSE = "#f43f5e";
const ROSE_BUDGET = 3;

/**
 * "What needs your attention" panel. Top-urgency tasks + an optional
 * synthesized standup row. Task rows are expandable (<details>) and
 * reveal owner, department, and a deterministic recommendation.
 */
export function AttentionList({
  dataset,
  onTaskClick,
  onOpenModal,
}: AttentionListProps) {
  const rows = attentionRows(dataset);
  if (rows.length === 0) return null;

  // Build a quick lookup so each row can resolve its full Task without
  // re-scanning dataset.tasks per render.
  const taskById = new Map<string, Task>();
  for (const t of dataset.tasks) taskById.set(t.task_id, t);

  // Rose budget — first N rose:true rows get the dot, rest go silent.
  let roseRemaining = ROSE_BUDGET;
  const rendered = rows.map((row) => {
    const showRose = row.rose && roseRemaining > 0;
    if (showRose) roseRemaining--;
    return {
      row,
      showRose,
      task: row.taskId ? taskById.get(row.taskId) ?? null : null,
    };
  });

  // KPI tiles stagger 0/100/200ms with 300ms duration → last tile lands
  // ≈500ms. Attention rows begin at 300ms (overlapping the tail of the
  // KPI animation slightly) with 50ms steps.
  const ROW_BASE_DELAY_MS = 300;
  const ROW_STEP_MS = 50;

  return (
    <section>
      <p className="text-xs text-muted uppercase tracking-widest mb-4">
        What needs your attention
      </p>
      <div className="card-surface rounded-md divide-y divide-card-border">
        {rendered.map(({ row, showRose, task }, i) => (
          <RowContainer
            key={i}
            row={row}
            task={task}
            showRose={showRose}
            dataset={dataset}
            onTaskClick={onTaskClick}
            onOpenModal={onOpenModal}
            animationDelay={`${ROW_BASE_DELAY_MS + i * ROW_STEP_MS}ms`}
          />
        ))}
      </div>
    </section>
  );
}

function RowContainer({
  row,
  task,
  showRose,
  dataset,
  onTaskClick,
  onOpenModal,
  animationDelay,
}: {
  row: AttentionRow;
  task: Task | null;
  showRose: boolean;
  dataset: NormalizedDataset;
  onTaskClick?: (id: string) => void;
  onOpenModal?: (params: {
    actionType: ActionType;
    department?: string;
    assignee?: string;
  }) => void;
  animationDelay: string;
}) {
  // Standup (synthesized) rows stay non-expandable — single line.
  if (row.synthesized) {
    return (
      <StandupRow
        row={row}
        onOpenModal={onOpenModal}
        animationDelay={animationDelay}
      />
    );
  }

  return (
    <ExpandableRow
      row={row}
      task={task}
      showRose={showRose}
      dataset={dataset}
      onTaskClick={onTaskClick}
      animationDelay={animationDelay}
    />
  );
}

function StandupRow({
  row,
  onOpenModal,
  animationDelay,
}: {
  row: AttentionRow;
  onOpenModal?: (params: {
    actionType: ActionType;
    department?: string;
    assignee?: string;
  }) => void;
  animationDelay: string;
}) {
  const handleGenerate = () => {
    // Standup agenda draws from all overdue/blocked tasks — no dept/assignee filter.
    onOpenModal?.({ actionType: "standup_agenda" });
  };

  return (
    <div
      className="px-6 py-4 flex items-center justify-between gap-4 animate-fade-in-up"
      style={{ animationDelay }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
        <span className="text-sm text-primary truncate">{row.sentence}</span>
      </div>
      <button
        onClick={handleGenerate}
        className="text-xs text-secondary px-3 py-1.5 rounded-md hover:bg-card-border transition-colors flex-shrink-0"
      >
        {row.action}
      </button>
    </div>
  );
}

function ExpandableRow({
  row,
  task,
  showRose,
  dataset,
  onTaskClick,
  animationDelay,
}: {
  row: AttentionRow;
  task: Task | null;
  showRose: boolean;
  dataset: NormalizedDataset;
  onTaskClick?: (id: string) => void;
  animationDelay: string;
}) {
  const handleAction = (e: React.MouseEvent) => {
    // Don't toggle the <details> when clicking the action button.
    e.preventDefault();
    e.stopPropagation();
    if (row.taskId) onTaskClick?.(row.taskId);
  };

  const recommendation = task
    ? recommendAction(task, dataset)
    : null;

  return (
    <details
      className="group animate-fade-in-up [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
      style={{ animationDelay }}
    >
      <summary className="px-6 py-4 cursor-pointer flex items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showRose ? (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: ROSE }}
              aria-hidden
            />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
          )}
          <span className="text-sm text-primary truncate">{row.sentence}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleAction}
            className="text-xs text-secondary px-3 py-1.5 rounded-md hover:bg-card-border transition-colors"
          >
            {row.action}
          </button>
          <ChevronDown className="w-3.5 h-3.5 text-muted transition-transform group-open:rotate-180" />
        </div>
      </summary>

      {task && (
        <div className="px-6 pb-4 pt-1">
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 gap-x-4 text-xs">
            <dt className="text-muted uppercase tracking-wider">Owner</dt>
            <dd className="text-secondary">
              {task.assignee ?? "Unassigned"}
            </dd>

            <dt className="text-muted uppercase tracking-wider">Department</dt>
            <dd className="text-secondary">{task.department ?? "—"}</dd>

            <dt className="text-muted uppercase tracking-wider">
              Recommended
            </dt>
            <dd className="text-primary">{recommendation}</dd>
          </dl>
        </div>
      )}
    </details>
  );
}
