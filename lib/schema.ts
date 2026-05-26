import { Task } from "@/app/api/analyze/route";

// ---------------------------------------------------------------------------
// Canonical schema constants
// ---------------------------------------------------------------------------

export const CANONICAL_FIELDS = [
  "task_id",
  "task_name",
  "assignee",
  "status",
  "priority",
  "created_date",
  "due_date",
  "completed_date",
  "department",
  "category",
  "estimated_hours",
  "actual_hours",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export const CANONICAL_STATUSES = [
  "Done",
  "In Progress",
  "Blocked",
  "Not Started",
] as const;

export type CanonicalStatus = (typeof CANONICAL_STATUSES)[number];

/** "Completed" is accepted as a synonym of "Done" in the fallback path. */
const CANONICAL_STATUS_SET = new Set<string>([...CANONICAL_STATUSES, "Completed"]);

export const REQUIRED_FIELDS: CanonicalField[] = [
  "task_id",
  "task_name",
  "assignee",
  "status",
];

// ---------------------------------------------------------------------------
// Mapping & validation types
// ---------------------------------------------------------------------------

export interface ProposedMapping {
  column_map: Record<CanonicalField, string | null>;
  status_value_map: Record<string, CanonicalStatus | null>;
}

export interface ValidationIssue {
  rowIndex: number; // 0-based
  taskId?: string;
  reasons: string[];
  dropped: boolean;
}

export interface ValidationReport {
  total: number;
  valid: number;
  dropped: number;
  flagged: number;
  issues: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Canonical-check (fallback path gate)
// ---------------------------------------------------------------------------

/**
 * A CSV is canonical if (a) every canonical field is present as a header AND
 * (b) every non-empty status value is one of the canonical statuses (or "Completed").
 * Both conditions are required — non-canonical status values force the mapping flow.
 */
export function isCanonicalCSV(rows: Record<string, string>[]): boolean {
  if (rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  const headersMatch = CANONICAL_FIELDS.every((c) => headers.includes(c));
  if (!headersMatch) return false;

  return rows.every((r) => {
    const v = (r.status || "").trim();
    return v === "" || CANONICAL_STATUS_SET.has(v);
  });
}

// ---------------------------------------------------------------------------
// Distinct raw status values (used by the SchemaMapper UI)
// ---------------------------------------------------------------------------

export function extractRawStatusValues(
  rows: Record<string, string>[],
  statusColumn: string | null
): string[] {
  if (!statusColumn) return [];
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = (r[statusColumn] || "").trim();
    if (v) set.add(v);
  });
  return Array.from(set);
}

// ---------------------------------------------------------------------------
// Deterministic reshape + validation
// (Runs AFTER the user has confirmed the mapping. No AI here.)
// ---------------------------------------------------------------------------

/** ISO-8601 yyyy-mm-dd parser; returns "" if input is unparseable. */
function normalizeDate(raw: string | undefined | null): {
  value: string;
  parsed: boolean;
  hadInput: boolean;
} {
  const s = (raw ?? "").trim();
  if (!s) return { value: "", parsed: true, hadInput: false };

  // Already yyyy-mm-dd? Accept verbatim if it's a real date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00Z");
    if (!isNaN(d.getTime())) return { value: s, parsed: true, hadInput: true };
  }

  // Try Date constructor as a fallback (handles mm/dd/yyyy, etc.).
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString().split("T")[0];
    return { value: iso, parsed: true, hadInput: true };
  }

  return { value: "", parsed: false, hadInput: true };
}

export function reshapeWithMapping(
  rawData: Record<string, string>[],
  mapping: ProposedMapping
): { tasks: Task[]; report: ValidationReport } {
  const tasks: Task[] = [];
  const issues: ValidationIssue[] = [];

  rawData.forEach((row, rowIndex) => {
    const reasons: string[] = [];
    const get = (field: CanonicalField): string => {
      const col = mapping.column_map[field];
      if (!col) return "";
      return (row[col] ?? "").toString().trim();
    };

    // ── Required fields ───────────────────────────────────────────────
    const task_id = get("task_id");
    const task_name = get("task_name");
    const assignee = get("assignee");
    const rawStatus = get("status");

    REQUIRED_FIELDS.forEach((f) => {
      const v = get(f);
      if (!v) reasons.push(`missing required field "${f}"`);
    });

    // ── Status mapping (must resolve to canonical) ────────────────────
    let canonicalStatus: string = "";
    if (rawStatus) {
      // Direct hit?
      if (CANONICAL_STATUS_SET.has(rawStatus)) {
        canonicalStatus = rawStatus === "Completed" ? "Done" : rawStatus;
      } else {
        const mapped = mapping.status_value_map[rawStatus];
        if (mapped) {
          canonicalStatus = mapped;
        } else {
          reasons.push(`unmapped status value "${rawStatus}"`);
        }
      }
    }

    // ── Date parsing (flag, not drop) ─────────────────────────────────
    const created = normalizeDate(get("created_date"));
    const due = normalizeDate(get("due_date"));
    const completed = normalizeDate(get("completed_date"));
    if (!created.parsed)
      reasons.push(`unparseable created_date "${get("created_date")}"`);
    if (!due.parsed)
      reasons.push(`unparseable due_date "${get("due_date")}"`);
    if (!completed.parsed)
      reasons.push(`unparseable completed_date "${get("completed_date")}"`);

    // ── Drop / flag decision ──────────────────────────────────────────
    const dropReasons = reasons.filter((r) =>
      r.startsWith("missing required field") || r.startsWith("unmapped status")
    );
    const dropped = dropReasons.length > 0;

    if (reasons.length > 0) {
      issues.push({
        rowIndex,
        taskId: task_id || undefined,
        reasons,
        dropped,
      });
    }

    if (dropped) return; // Don't include in the canonical task list.

    tasks.push({
      task_id,
      task_name,
      assignee,
      status: canonicalStatus,
      priority: get("priority"),
      created_date: created.value,
      due_date: due.value,
      completed_date: completed.value,
      department: get("department"),
      category: get("category"),
      estimated_hours: get("estimated_hours"),
      actual_hours: get("actual_hours"),
    });
  });

  const droppedCount = issues.filter((i) => i.dropped).length;
  const flaggedCount = issues.length - droppedCount;

  return {
    tasks,
    report: {
      total: rawData.length,
      valid: tasks.length,
      dropped: droppedCount,
      flagged: flaggedCount,
      issues,
    },
  };
}

/**
 * For canonical CSVs (fallback path): convert raw rows to Task[] directly,
 * normalizing only "Completed" → "Done". No mapping needed.
 */
export function canonicalRowsToTasks(rows: Record<string, string>[]): Task[] {
  return rows.map((r) => ({
    task_id: r.task_id || "",
    task_name: r.task_name || "",
    assignee: r.assignee || "",
    status: r.status === "Completed" ? "Done" : r.status || "",
    priority: r.priority || "",
    created_date: r.created_date || "",
    due_date: r.due_date || "",
    completed_date: r.completed_date || "",
    department: r.department || "",
    category: r.category || "",
    estimated_hours: r.estimated_hours || "",
    actual_hours: r.actual_hours || "",
  }));
}
