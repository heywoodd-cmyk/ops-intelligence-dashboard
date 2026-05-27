import type { NormalizedDataset } from "./schema";

// ---------------------------------------------------------------------
// Deterministic hero copy — no AI. Four branches, evaluated in order:
//   0. Department-driven  (hasDepartment AND top dept has ≥3 overdue)
//   1. Assignee-driven    (no dept signal but top assignee has ≥3 overdue)
//   2. Status-driven      (any overdue/blocked tasks at all)
//   3. All-clear          (nothing past due)
// ---------------------------------------------------------------------

export interface HeroButton {
  label: string;
  action: string; // identifier consumed by page.tsx → DraftActionModal
}

export interface HeroCopy {
  headline: string;
  subline: string;
  buttons: HeroButton[];
  // The dataset slice this branch chose — passed straight to the modal
  // so the route's prompt sees only the right tasks.
  context?: {
    department?: string;
    assignee?: string;
  };
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export function heroCopy(dataset: NormalizedDataset): HeroCopy {
  const { tasks, hasAssignee, hasDepartment } = dataset;

  const overdue = tasks.filter((t) => t.overdue);
  const blocked = tasks.filter((t) => t.status === "Blocked");
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const total = tasks.length;

  // --- topDepartment by overdue count ----------------------------------
  let topDepartment: string | null = null;
  let topDepartmentOverdue = 0;
  let topDepartmentBlocking = 0;

  if (hasDepartment && overdue.length > 0) {
    const byDept = new Map<string, number>();
    for (const t of overdue) {
      if (!t.department) continue;
      byDept.set(t.department, (byDept.get(t.department) ?? 0) + 1);
    }
    // Deterministic tie-break: count desc, then name asc.
    const ranked = [...byDept.entries()].sort(([a, ac], [b, bc]) => {
      if (bc !== ac) return bc - ac;
      return a.localeCompare(b);
    });
    if (ranked.length > 0) {
      topDepartment = ranked[0][0];
      topDepartmentOverdue = ranked[0][1];
      topDepartmentBlocking = tasks.filter(
        (t) => t.department === topDepartment && t.status === "Blocked"
      ).length;
    }
  }

  // --- topAssignee by overdue count (fallback when no dept signal) -----
  let topAssignee: string | null = null;
  let topAssigneeOverdue = 0;
  let topAssigneeBlocking = 0;

  if (hasAssignee && overdue.length > 0) {
    const byAssignee = new Map<string, number>();
    for (const t of overdue) {
      if (!t.assignee) continue;
      byAssignee.set(t.assignee, (byAssignee.get(t.assignee) ?? 0) + 1);
    }
    const ranked = [...byAssignee.entries()].sort(([a, ac], [b, bc]) => {
      if (bc !== ac) return bc - ac;
      return a.localeCompare(b);
    });
    if (ranked.length > 0) {
      topAssignee = ranked[0][0];
      topAssigneeOverdue = ranked[0][1];
      topAssigneeBlocking = tasks.filter(
        (t) => t.assignee === topAssignee && t.status === "Blocked"
      ).length;
    }
  }

  // === Branch 0 — department-driven ===================================
  if (hasDepartment && topDepartment && topDepartmentOverdue >= 3) {
    const blockingVerb = topDepartmentBlocking === 1 ? "is" : "are";
    return {
      headline: `${overdue.length} tasks are overdue across the team`,
      subline: `${topDepartmentOverdue} of them sit in ${topDepartment}. ${topDepartmentBlocking} ${blockingVerb} blocking other people's work.`,
      buttons: [
        {
          label: `Brief ${topDepartment} lead`,
          action: "brief-department",
        },
        {
          label: `View ${topDepartment} tasks`,
          action: "view-department",
        },
      ],
      context: { department: topDepartment },
    };
  }

  // === Branch 1 — assignee-driven =====================================
  if (topAssignee && topAssigneeOverdue >= 3) {
    const blockingVerb = topAssigneeBlocking === 1 ? "is" : "are";
    return {
      headline: `${overdue.length} tasks are overdue across the team`,
      subline: `${topAssigneeOverdue} of them sit with ${topAssignee}. ${topAssigneeBlocking} ${blockingVerb} blocking other people's work.`,
      buttons: [
        {
          label: `Draft message to ${firstName(topAssignee)}`,
          action: "draft-message",
        },
        {
          label: `View ${firstName(topAssignee)}'s tasks`,
          action: "view-assignee",
        },
      ],
      context: { assignee: topAssignee },
    };
  }

  // === Branch 2 — status-driven =======================================
  if (overdue.length > 0 || blocked.length > 0) {
    const overdueNoun = overdue.length === 1 ? "task needs" : "tasks need";
    const blockedVerb = blocked.length === 1 ? "is" : "are";
    const overdueVerb = overdue.length === 1 ? "is" : "are";
    const headlineCount = Math.max(overdue.length, 1);
    return {
      headline: `${headlineCount} ${overdueNoun} attention`,
      subline:
        overdue.length > 0
          ? `${blocked.length} ${blockedVerb} blocked, ${overdue.length} ${overdueVerb} past due.`
          : `${blocked.length} ${blockedVerb} blocked.`,
      buttons: [
        { label: "Draft team update", action: "draft-update" },
        { label: "View overdue tasks", action: "view-overdue" },
      ],
    };
  }

  // === Branch 3 — all-clear ===========================================
  const totalNoun = total === 1 ? "task tracked" : "tasks tracked";
  return {
    headline: `${total} ${totalNoun}, on schedule`,
    subline:
      total === 0
        ? "No tasks loaded."
        : `No overdue items. ${inProgress} in progress.`,
    buttons: [
      { label: "Generate weekly summary", action: "generate-summary" },
    ],
  };
}
