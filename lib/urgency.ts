import type { NormalizedDataset, Task } from "./schema";

// ---------------------------------------------------------------------
// Deterministic urgency scoring + attention-row generation.
// No Claude calls. Sentences are templated from task data for speed.
// ---------------------------------------------------------------------

export interface AttentionRow {
  taskId: string;        // empty for the synthesized standup row
  sentence: string;      // one sentence, present-tense
  action: string;        // "Unblock" | "Escalate" | "View" | "Generate"
  rose: boolean;         // true if the row warrants a rose badge
  synthesized?: boolean; // true only for the standup row
}

const MS_PER_DAY = 86_400_000;

function daysOverdue(task: Task, today: Date): number {
  if (!task.overdue || !task.due_date) return 0;
  return Math.max(
    0,
    Math.floor((today.getTime() - task.due_date.getTime()) / MS_PER_DAY)
  );
}

/**
 * Human-readable task reference: "Task name (T-XXX)" when a real name is
 * available; falls back to bare "T-XXX" when task_name is missing or was
 * synthesized as a placeholder (lib/schema.ts uses "(untitled …)" when
 * neither a task_name column nor a fallback text column exists).
 */
function taskRef(task: Task): string {
  const name = task.task_name?.trim() ?? "";
  if (!name || name.startsWith("(untitled")) return task.task_id;
  return `${name} (${task.task_id})`;
}

/** Spec formula: overdue 100, blocked 50, critical 30 / high 15, days×2 */
function urgencyScore(task: Task, today: Date): number {
  return (
    (task.overdue ? 100 : 0) +
    (task.status === "Blocked" ? 50 : 0) +
    (task.priority === "Critical"
      ? 30
      : task.priority === "High"
        ? 15
        : 0) +
    daysOverdue(task, today) * 2
  );
}

/**
 * Top 4 ranked tasks (with non-zero urgency) rendered into AttentionRow.
 * Reassign variant skipped — no cheap cross-task dependency signal.
 * Synthesized standup row appended only when at least one overdue or
 * blocked task exists. Cap 5 rows total.
 */
export function attentionRows(dataset: NormalizedDataset): AttentionRow[] {
  const today = new Date(dataset.today + "T00:00:00");

  const ranked = dataset.tasks
    .map((t) => ({ task: t, score: urgencyScore(t, today) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const rows: AttentionRow[] = ranked.map(({ task }) => {
    const blocked = task.status === "Blocked";
    const overdue = task.overdue;
    const days = daysOverdue(task, today);
    const critical = task.priority === "Critical";
    const ref = taskRef(task);

    if (blocked && overdue) {
      return {
        taskId: task.task_id,
        sentence: `${ref} has been blocked ${days} ${days === 1 ? "day" : "days"}.`,
        action: "Unblock",
        rose: true,
      };
    }
    if (critical && overdue) {
      return {
        taskId: task.task_id,
        sentence: `${ref} is critical and ${days} ${days === 1 ? "day" : "days"} past due.`,
        action: "Escalate",
        rose: true,
      };
    }
    if (overdue) {
      return {
        taskId: task.task_id,
        sentence: `${ref} is ${days} ${days === 1 ? "day" : "days"} past due.`,
        action: "View",
        rose: true,
      };
    }
    if (blocked) {
      return {
        taskId: task.task_id,
        sentence: `${ref} is blocked.`,
        action: "Unblock",
        rose: true,
      };
    }
    // Remaining: critical / high but not overdue
    return {
      taskId: task.task_id,
      sentence: `${ref} needs review.`,
      action: "View",
      rose: false,
    };
  });

  // Synthesized standup row — only when there's a real problem to talk about
  const hasUrgentSignal = dataset.tasks.some(
    (t) => t.overdue || t.status === "Blocked"
  );
  if (hasUrgentSignal) {
    rows.push({
      taskId: "",
      sentence: "Monday standup needs an agenda.",
      action: "Generate",
      rose: false,
      synthesized: true,
    });
  }

  return rows.slice(0, 5);
}
