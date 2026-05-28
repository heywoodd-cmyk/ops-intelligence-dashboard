import type { NormalizedDataset } from "./schema";

// ---------------------------------------------------------------------
// Deterministic integrity checks. Run on every render against the
// current dataset, so edits move counts up or down honestly. No Claude.
//
// What we check, and why each one matters:
//   1. Duplicate task IDs       — count the same work twice.
//   2. Dates out of order       — due before created, or completed
//                                 before created. Impossible per
//                                 ordinary scheduling.
//   3. Completed date without
//      Done status              — completion logged but state never
//                                 closed; the row contradicts itself.
//   4. Missing critical fields  — synthesized task_name (the
//                                 "(untitled X)" fallback) or status
//                                 defaulted to "Unknown". Tells the
//                                 viewer the source data was thin.
// ---------------------------------------------------------------------

export interface IntegrityReport {
  duplicates: string[];           // task IDs that appear more than once
  datesOutOfOrder: string[];      // task IDs with due < created or completed < created
  completedButNotDone: string[];  // task IDs with completed_date but status !== Done
  missingCritical: string[];      // task IDs missing task name or status
}

export function runIntegrityChecks(
  dataset: NormalizedDataset
): IntegrityReport {
  const tasks = dataset.tasks;

  // 1. Duplicate task IDs
  const idCounts = new Map<string, number>();
  for (const t of tasks) {
    idCounts.set(t.task_id, (idCounts.get(t.task_id) ?? 0) + 1);
  }
  const duplicates: string[] = [];
  for (const [id, count] of idCounts.entries()) {
    if (count > 1) duplicates.push(id);
  }

  // 2. Dates out of order
  const datesOutOfOrder: string[] = [];
  for (const t of tasks) {
    if (
      t.due_date &&
      t.created_date &&
      t.due_date.getTime() < t.created_date.getTime()
    ) {
      datesOutOfOrder.push(t.task_id);
      continue;
    }
    if (
      t.completed_date &&
      t.created_date &&
      t.completed_date.getTime() < t.created_date.getTime()
    ) {
      datesOutOfOrder.push(t.task_id);
    }
  }

  // 3. Completed date but status not Done
  const completedButNotDone: string[] = [];
  for (const t of tasks) {
    if (t.completed_date && t.status !== "Done") {
      completedButNotDone.push(t.task_id);
    }
  }

  // 4. Missing critical fields (post-defaulting)
  //    task_name starts with "(untitled " when normalizeDataset
  //    couldn't find a real name; status === "Unknown" when no source
  //    column existed AND no value was recognized.
  const missingCritical: string[] = [];
  for (const t of tasks) {
    const synthesizedName =
      !t.task_name || t.task_name.startsWith("(untitled");
    const unknownStatus = t.status === "Unknown";
    if (synthesizedName || unknownStatus) missingCritical.push(t.task_id);
  }

  return {
    duplicates,
    datesOutOfOrder,
    completedButNotDone,
    missingCritical,
  };
}

export function integrityIsClean(report: IntegrityReport): boolean {
  return (
    report.duplicates.length === 0 &&
    report.datesOutOfOrder.length === 0 &&
    report.completedButNotDone.length === 0 &&
    report.missingCritical.length === 0
  );
}
