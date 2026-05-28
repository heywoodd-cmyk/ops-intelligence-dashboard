import type { CanonicalStatus, NormalizedDataset, Task } from "./schema";

// ---------------------------------------------------------------------
// Editable-status mutation. The only stored derived field on Task is
// `overdue`, so this is the only thing we actively maintain when status
// changes. Every other dashboard metric reads from dataset.tasks at
// render time and will naturally recompute when the parent's state
// updates.
//
// Pure. Returns the same dataset reference when nothing changes so
// useMemo/referential-equality consumers (modifiedTaskIds, animated
// number deltas) short-circuit cleanly.
// ---------------------------------------------------------------------

export function setTaskStatus(
  dataset: NormalizedDataset,
  taskId: string,
  newStatus: CanonicalStatus
): NormalizedDataset {
  const today = new Date(dataset.today + "T00:00:00");

  let changed = false;
  const nextTasks: Task[] = dataset.tasks.map((t) => {
    if (t.task_id !== taskId) return t;
    if (t.status === newStatus) return t; // no-op edit
    changed = true;
    const overdue =
      !!t.due_date && t.due_date < today && newStatus !== "Done";
    return { ...t, status: newStatus, overdue };
  });

  if (!changed) return dataset;
  return { ...dataset, tasks: nextTasks };
}

/**
 * Set of task IDs whose status differs from the original dataset.
 * Used by the modified-row dot in the table.
 */
export function modifiedTaskIdSet(
  current: NormalizedDataset,
  original: NormalizedDataset
): Set<string> {
  if (current === original) return new Set();
  const originalStatus = new Map<string, CanonicalStatus>(
    original.tasks.map((t) => [t.task_id, t.status])
  );
  const set = new Set<string>();
  for (const t of current.tasks) {
    if (originalStatus.get(t.task_id) !== t.status) set.add(t.task_id);
  }
  return set;
}
