import type { NormalizedDataset } from "./schema";

// ---------------------------------------------------------------------
// Weekly delta — computed from the optional weekly_snapshot column.
// Returns null whenever the source data lacks the column, so the KPI
// tiles can simply check `=== null` to decide whether to render sublines.
// No hardcoded fallbacks anywhere. No isDemo flag.
// ---------------------------------------------------------------------

export interface WeeklyDelta {
  overduePrev: number;   // overdue count 7 days ago
  blockedPrev: number;   // blocked count 7 days ago
  onTrackPrev: number;   // completion percentage 7 days ago (0–100)
}

const MS_PER_DAY = 86_400_000;

export function computeWeeklyDelta(
  dataset: NormalizedDataset
): WeeklyDelta | null {
  if (!dataset.hasWeeklySnapshot) return null;

  const today = new Date(dataset.today + "T00:00:00");
  const sevenDaysAgo = new Date(today.getTime() - 7 * MS_PER_DAY);

  let overduePrev = 0;
  let blockedPrev = 0;
  let donePrev = 0;
  let snapshotRows = 0; // rows actually carrying a snapshot value

  for (const task of dataset.tasks) {
    const prior = task.weekly_snapshot;
    if (!prior) continue;
    snapshotRows++;

    // Prior overdue: due_date existed and fell before "7 days ago",
    // and the prior status wasn't "Done".
    if (
      task.due_date &&
      task.due_date < sevenDaysAgo &&
      prior !== "Done"
    ) {
      overduePrev++;
    }
    if (prior === "Blocked") blockedPrev++;
    if (prior === "Done") donePrev++;
  }

  // If the column was mapped but every cell was empty, treat as no signal.
  if (snapshotRows === 0) return null;

  const total = dataset.tasks.length;
  const onTrackPrev = total > 0 ? Math.round((donePrev / total) * 100) : 0;

  return { overduePrev, blockedPrev, onTrackPrev };
}
