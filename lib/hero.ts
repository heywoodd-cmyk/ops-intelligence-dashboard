import type { NormalizedDataset } from "./schema";

// ---------------------------------------------------------------------
// Deterministic hero copy — no AI. Three branches per spec.
// ---------------------------------------------------------------------

export interface HeroButton {
  label: string;
  action: string; // identifier for Day-2 wiring; not yet functional
}

export interface HeroCopy {
  headline: string;
  subline: string;
  buttons: HeroButton[];
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export function heroCopy(dataset: NormalizedDataset): HeroCopy {
  const { tasks, hasAssignee } = dataset;

  const overdue = tasks.filter((t) => t.overdue);
  const blocked = tasks.filter((t) => t.status === "Blocked");
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const total = tasks.length;

  // topAssignee — by overdue count. Null when assignee data is absent or
  // when nobody has any overdue tasks.
  let topAssignee: string | null = null;
  let topAssigneeOverdue = 0;
  let topAssigneeBlocking = 0;

  if (hasAssignee && overdue.length > 0) {
    const byAssignee = new Map<string, number>();
    for (const t of overdue) {
      if (!t.assignee) continue;
      byAssignee.set(t.assignee, (byAssignee.get(t.assignee) ?? 0) + 1);
    }
    for (const [name, count] of byAssignee.entries()) {
      if (count > topAssigneeOverdue) {
        topAssignee = name;
        topAssigneeOverdue = count;
      }
    }
    if (topAssignee) {
      topAssigneeBlocking = tasks.filter(
        (t) => t.assignee === topAssignee && t.status === "Blocked"
      ).length;
    }
  }

  // Branch A: person-driven (only when assignee data exists & ≥3 overdue)
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
    };
  }

  // Branch B: status-driven fallback (also the no-assignee path)
  if (overdue.length > 0) {
    const overdueNoun = overdue.length === 1 ? "task needs" : "tasks need";
    const blockedVerb = blocked.length === 1 ? "is" : "are";
    const overdueVerb = overdue.length === 1 ? "is" : "are";
    return {
      headline: `${overdue.length} ${overdueNoun} attention`,
      subline: `${blocked.length} ${blockedVerb} blocked, ${overdue.length} ${overdueVerb} past due.`,
      buttons: [
        { label: "Draft team update", action: "draft-update" },
        { label: "View overdue tasks", action: "view-overdue" },
      ],
    };
  }

  // Branch C: all clear
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
