import type { NormalizedDataset, Task } from "./schema";

// ---------------------------------------------------------------------
// Deterministic three-rule recommendation engine.
// No LLM call — every output is reproducible from inputs. If asked
// "how was this decided", point at the rules below.
//
// Rule 1 — dependency hint (blocked tasks only):
//   Find another task in the same department whose name shares at least
//   one non-stopword token. Pick the candidate with most overlap; ties
//   broken by lexicographic task_id. If found AND has an assignee:
//   "Follow up with {assignee} who owns {task_id}."
//
// Rule 2 — top-quartile workload:
//   If the task's assignee is in the top 25% by active-task count, find
//   the least-loaded teammate in the same department and recommend
//   reassignment.
//
// Rule 3 — default escalate (always produces output):
//   "Escalate to {department} lead or follow up with {assignee} directly."
// ---------------------------------------------------------------------

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "to",
  "for",
  "and",
  "with",
  "or",
]);

/**
 * Lowercase, split on non-alphanumerics, drop stopwords + single-char
 * tokens. Returns a Set for O(1) overlap checks.
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  );
}

/**
 * Find another task in the same department whose name shares the most
 * non-stopword tokens with the given task AND is owned by someone else.
 * Recommending "follow up with yourself" is useless, so same-assignee
 * candidates are excluded. Returns null if no usable dependency found.
 */
function findDependency(task: Task, allTasks: Task[]): Task | null {
  if (!task.department) return null;
  const taskTokens = tokenize(task.task_name);
  if (taskTokens.size === 0) return null;

  const candidates = allTasks
    .filter(
      (t) =>
        t.task_id !== task.task_id &&
        t.department === task.department &&
        t.assignee &&
        t.assignee !== task.assignee
    )
    .map((t) => {
      const tTokens = tokenize(t.task_name);
      let overlap = 0;
      for (const tok of taskTokens) if (tTokens.has(tok)) overlap++;
      return { task: t, overlap };
    })
    .filter(({ overlap }) => overlap > 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return a.task.task_id.localeCompare(b.task.task_id);
  });
  return candidates[0].task;
}

/**
 * Per-assignee active-task counts. "Active" = not Done.
 */
function activeCountsByAssignee(allTasks: Task[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of allTasks) {
    if (!t.assignee) continue;
    if (t.status === "Done") continue;
    m.set(t.assignee, (m.get(t.assignee) ?? 0) + 1);
  }
  return m;
}

/**
 * Is the task's assignee in the top quartile by active-task count?
 * Threshold = count at floor(N × 0.75) in the ascending-sorted list.
 * Returns false when there are fewer than 2 assignees (no meaningful
 * distribution).
 */
function isAssigneeInTopQuartile(task: Task, allTasks: Task[]): boolean {
  if (!task.assignee) return false;
  const counts = activeCountsByAssignee(allTasks);
  const myCount = counts.get(task.assignee);
  if (!myCount) return false;
  if (counts.size < 2) return false;

  const sorted = [...counts.values()].sort((a, b) => a - b);
  const idx = Math.min(
    Math.floor(sorted.length * 0.75),
    sorted.length - 1
  );
  const threshold = sorted[idx];
  return myCount >= threshold;
}

/**
 * Lowest-active-count teammate in the same department, excluding the
 * task's current assignee. Returns null if dept has no other members.
 */
function findLeastLoadedTeammate(
  task: Task,
  allTasks: Task[]
): string | null {
  if (!task.assignee || !task.department) return null;
  const counts = new Map<string, number>();
  for (const t of allTasks) {
    if (!t.assignee || t.assignee === task.assignee) continue;
    if (t.department !== task.department) continue;
    if (t.status === "Done") continue;
    counts.set(t.assignee, (counts.get(t.assignee) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let least: string | null = null;
  let leastCount = Infinity;
  // Deterministic iteration order: sort by name asc, then pick the
  // lowest count.
  const entries = [...counts.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  for (const [name, c] of entries) {
    if (c < leastCount) {
      least = name;
      leastCount = c;
    }
  }
  return least;
}

/**
 * Apply the three rules in order. First match wins. Rule 3 is total —
 * the function always returns a non-empty string.
 */
export function recommendAction(
  task: Task,
  dataset: NormalizedDataset
): string {
  // Rule 1 — blocked + dependency hint
  if (task.status === "Blocked") {
    const dep = findDependency(task, dataset.tasks);
    if (dep && dep.assignee) {
      return `Follow up with ${dep.assignee} who owns ${dep.task_id}.`;
    }
  }

  // Rule 2 — top-quartile workload → reassign
  if (task.assignee && isAssigneeInTopQuartile(task, dataset.tasks)) {
    const teammate = findLeastLoadedTeammate(task, dataset.tasks);
    if (teammate) return `Consider reassigning to ${teammate}.`;
  }

  // Rule 3 — default escalate
  if (task.department && task.assignee) {
    return `Escalate to ${task.department} lead or follow up with ${task.assignee} directly.`;
  }
  if (task.assignee) {
    return `Follow up with ${task.assignee} directly.`;
  }
  if (task.department) {
    return `Escalate to the ${task.department} lead.`;
  }
  return "Escalate to the team lead.";
}
