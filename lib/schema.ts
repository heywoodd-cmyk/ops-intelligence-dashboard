import {
  normalizeStatus,
  normalizePriority,
  parseDate,
} from "./normalize";

// =====================================================================
// CANONICAL MODEL — single source of truth for the dashboard.
// "AI interprets, code executes" — every count, derivation, and overdue
// flag is computed here. Claude never sees the full dataset.
// =====================================================================

export const CANONICAL_FIELDS = [
  "task_id",
  "task_name",
  "assignee",
  "status",
  "priority",
  "due_date",
  "created_date",
  "completed_date",
  "department",
  "weekly_snapshot",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export const CANONICAL_STATUSES = [
  "Done",
  "In Progress",
  "Blocked",
  "Not Started",
  "Unknown",
] as const;

export type CanonicalStatus = (typeof CANONICAL_STATUSES)[number];

export const CANONICAL_PRIORITIES = [
  "Critical",
  "High",
  "Medium",
  "Low",
] as const;

export type CanonicalPriority = (typeof CANONICAL_PRIORITIES)[number];

/**
 * Task — the canonical row model. Every dashboard component consumes Task,
 * never the raw CSV row.
 */
export interface Task {
  task_id: string;                          // synthesized "ROW-001" if missing
  task_name: string;                        // falls back to first text column
  assignee: string | null;
  status: CanonicalStatus;                  // defaults to "Unknown"
  priority: CanonicalPriority;              // defaults to "Medium"
  due_date: Date | null;
  created_date: Date | null;
  completed_date: Date | null;
  department: string | null;
  weekly_snapshot: CanonicalStatus | null;  // status 7 days ago, when available
  overdue: boolean;                         // derived: due_date < today AND status !== "Done"
}

// ---------------------------------------------------------------------
// Column aliases — deterministic, alphabetic, case/separator-tolerant.
// Anything not matched here is shipped to /api/map-columns for AI fallback.
// ---------------------------------------------------------------------

export const COLUMN_ALIASES: Record<CanonicalField, string[]> = {
  task_id: [
    "task_id", "id", "ticket_id", "task id", "ticket id",
    "task number", "task no", "ref",
  ],
  task_name: [
    "task_name", "task", "title", "name", "description",
    "summary", "task name",
  ],
  assignee: [
    "assignee", "owner", "assigned_to", "assigned to",
    "responsible", "person", "lead", "assignedto",
  ],
  status: ["status", "state", "stage", "progress"],
  priority: ["priority", "severity", "importance", "urgency", "level"],
  due_date: [
    "due_date", "due date", "deadline", "due",
    "target_date", "target date",
  ],
  created_date: [
    "created_date", "created date", "created", "opened",
    "start_date", "start date", "started",
  ],
  completed_date: [
    "completed_date", "completed date", "closed", "completed",
    "done_date", "done date", "resolved_date", "resolved",
  ],
  department: ["department", "dept", "team", "group", "function"],
  weekly_snapshot: [
    "weekly_snapshot", "snapshot", "prior_status",
    "last_week_status", "status_7d_ago",
  ],
};

/** Case-insensitive, separator-tolerant header normalization. */
function normHeader(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

// ---------------------------------------------------------------------
// Column matching — deterministic-first, AI as fallback
// ---------------------------------------------------------------------

export interface UnresolvedColumn {
  header: string;
  samples: string[];
}

export interface ColumnMatchResult {
  resolved: Partial<Record<CanonicalField, string>>;
  unresolved: UnresolvedColumn[];
}

/**
 * Deterministic alias match. Each canonical field claims the first matching
 * header in document order; ties broken by canonical-field declaration order.
 */
export function matchColumns(
  rows: Record<string, string>[]
): ColumnMatchResult {
  if (rows.length === 0) return { resolved: {}, unresolved: [] };

  const headers = Object.keys(rows[0]);
  const resolved: Partial<Record<CanonicalField, string>> = {};
  const claimed = new Set<string>();

  for (const field of CANONICAL_FIELDS) {
    const aliasSet = new Set(COLUMN_ALIASES[field].map(normHeader));
    for (const header of headers) {
      if (claimed.has(header)) continue;
      if (aliasSet.has(normHeader(header))) {
        resolved[field] = header;
        claimed.add(header);
        break;
      }
    }
  }

  const unresolved: UnresolvedColumn[] = headers
    .filter((h) => !claimed.has(h))
    .map((h) => ({
      header: h,
      samples: rows
        .slice(0, 3)
        .map((r) => (r[h] ?? "").toString().trim())
        .filter(Boolean),
    }));

  return { resolved, unresolved };
}

/**
 * Merge AI-proposed mappings into the deterministic match. A field already
 * claimed by deterministic matching wins; AI never overrides.
 */
export function mergeAIMapping(
  resolved: Partial<Record<CanonicalField, string>>,
  aiMapping: Record<string, CanonicalField | "ignore">
): Partial<Record<CanonicalField, string>> {
  const merged = { ...resolved };
  for (const [header, field] of Object.entries(aiMapping)) {
    if (field === "ignore") continue;
    if (!(CANONICAL_FIELDS as readonly string[]).includes(field)) continue;
    const f = field as CanonicalField;
    if (merged[f]) continue;
    merged[f] = header;
  }
  return merged;
}

// ---------------------------------------------------------------------
// Dataset normalization — runs AFTER column mapping is finalized.
// Synthesizes task_id, falls back task_name, defaults priority/status,
// parses dates with the date-fns fallback chain, and derives the overdue
// flag. All deterministic, no AI.
// ---------------------------------------------------------------------

export interface ParseError {
  rowIndex: number;
  taskId: string;
  field: CanonicalField;
  rawValue: string;
  reason: string;
}

export interface NormalizedDataset {
  tasks: Task[];
  rowCount: number;
  today: string; // ISO yyyy-mm-dd

  // Data-quality metadata — surfaced in the DataQualityBadge
  sourceFields: Partial<Record<CanonicalField, string>>;
  inferredFields: CanonicalField[];
  missingFields: CanonicalField[];
  /**
   * Canonical fields whose source column was assigned by /api/map-columns
   * (deterministic alias match failed; AI classified the header). Subset
   * of sourceFields. Populated by CSVUpload after AI fallback; absent on
   * datasets that took the pure-deterministic path.
   */
  aiMappedFields?: CanonicalField[];

  // Adaptive UI flags — components hide themselves when their source is missing
  hasAssignee: boolean;
  hasDueDate: boolean;
  hasStatus: boolean;
  hasPriority: boolean;
  hasDepartment: boolean;
  hasWeeklySnapshot: boolean;

  parseErrors: ParseError[];
}

export function normalizeDataset(
  rawRows: Record<string, string>[],
  columnMap: Partial<Record<CanonicalField, string>>
): NormalizedDataset {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  // Midnight today (local) — comparing against due_date Dates (also midnight).
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const parseErrors: ParseError[] = [];

  // task_name fallback: first un-claimed header
  const claimed = new Set(Object.values(columnMap));
  let taskNameFallback: string | null = null;
  if (!columnMap.task_name && rawRows.length > 0) {
    for (const header of Object.keys(rawRows[0])) {
      if (!claimed.has(header)) {
        taskNameFallback = header;
        break;
      }
    }
  }

  const tasks: Task[] = rawRows.map((row, idx) => {
    const get = (field: CanonicalField): string => {
      const col = columnMap[field];
      if (!col) return "";
      return (row[col] ?? "").toString().trim();
    };

    // task_id — synthesize if missing
    const task_id =
      get("task_id") || `ROW-${String(idx + 1).padStart(3, "0")}`;

    // task_name — explicit, then fallback column, then placeholder
    let task_name = get("task_name");
    if (!task_name && taskNameFallback) {
      task_name = (row[taskNameFallback] ?? "").toString().trim();
    }
    if (!task_name) task_name = `(untitled ${task_id})`;

    const assignee = get("assignee") || null;

    // status — normalize, default Unknown
    const rawStatus = get("status");
    const status = normalizeStatus(rawStatus);
    if (rawStatus && status === "Unknown") {
      parseErrors.push({
        rowIndex: idx,
        taskId: task_id,
        field: "status",
        rawValue: rawStatus,
        reason: "unrecognized status value",
      });
    }

    // priority — normalize, default Medium
    const priority = normalizePriority(get("priority"));

    // dates — parseDate returns null on failure; collect errors
    const parseDateField = (
      raw: string,
      field: CanonicalField
    ): Date | null => {
      if (!raw) return null;
      const d = parseDate(raw);
      if (!d) {
        parseErrors.push({
          rowIndex: idx,
          taskId: task_id,
          field,
          rawValue: raw,
          reason: "unparseable date",
        });
        return null;
      }
      return d;
    };
    const due_date = parseDateField(get("due_date"), "due_date");
    const created_date = parseDateField(
      get("created_date"),
      "created_date"
    );
    const completed_date = parseDateField(
      get("completed_date"),
      "completed_date"
    );

    const department = get("department") || null;

    // weekly_snapshot — normalize via the same status map; null if not present
    const rawSnapshot = get("weekly_snapshot");
    let weekly_snapshot: CanonicalStatus | null = null;
    if (rawSnapshot) {
      const s = normalizeStatus(rawSnapshot);
      if (s === "Unknown") {
        parseErrors.push({
          rowIndex: idx,
          taskId: task_id,
          field: "weekly_snapshot",
          rawValue: rawSnapshot,
          reason: "unrecognized prior status value",
        });
        weekly_snapshot = null;
      } else {
        weekly_snapshot = s;
      }
    }

    // overdue — derived flag, never read from CSV
    const overdue =
      !!due_date && due_date < todayMid && status !== "Done";

    return {
      task_id,
      task_name,
      assignee,
      status,
      priority,
      due_date,
      created_date,
      completed_date,
      department,
      weekly_snapshot,
      overdue,
    };
  });

  // Inferred vs missing field accounting — feeds the DataQualityBadge
  const inferredFields: CanonicalField[] = [];
  const missingFields: CanonicalField[] = [];

  if (!columnMap.task_id) inferredFields.push("task_id");
  if (!columnMap.task_name) {
    if (taskNameFallback) inferredFields.push("task_name");
    else missingFields.push("task_name");
  }
  if (!columnMap.status) inferredFields.push("status");
  if (!columnMap.priority) inferredFields.push("priority");

  for (const f of [
    "assignee",
    "due_date",
    "created_date",
    "completed_date",
    "department",
    "weekly_snapshot",
  ] as const) {
    if (!columnMap[f]) missingFields.push(f);
  }

  return {
    tasks,
    rowCount: tasks.length,
    today: todayStr,
    sourceFields: { ...columnMap },
    inferredFields,
    missingFields,
    hasAssignee: !!columnMap.assignee,
    hasDueDate: !!columnMap.due_date,
    hasStatus: !!columnMap.status,
    hasPriority: !!columnMap.priority,
    hasDepartment: !!columnMap.department,
    hasWeeklySnapshot: !!columnMap.weekly_snapshot,
    parseErrors,
  };
}
