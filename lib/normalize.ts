import { isValid, parse, parseISO } from "date-fns";
import type { CanonicalStatus, CanonicalPriority } from "./schema";

// ---------------------------------------------------------------------
// Date parsing — date-fns fallback chain
// ---------------------------------------------------------------------

/**
 * Tries ISO 8601 first, then a chain of common locale formats. Returns
 * null if nothing parses. Caller logs the failure to `parseErrors`.
 *
 * Order matters: US-style (M/D/Y) is tried before EU-style (D/M/Y)
 * because US dominates the operations datasets we see; for genuinely
 * ambiguous dates the first match wins, which is documented behaviour.
 */
export function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO 8601 (e.g. 2026-05-14, 2026-05-14T10:00:00Z)
  const iso = parseISO(s);
  if (isValid(iso)) return iso;

  const today = new Date();
  const formats = [
    "MM/dd/yyyy", // 05/14/2026
    "M/d/yyyy",   // 5/14/2026
    "MM/dd/yy",   // 05/14/26
    "M/d/yy",     // 5/14/26
    "dd/MM/yyyy", // 14/05/2026
    "d/M/yyyy",   // 14/5/2026
    "MMMM d, yyyy", // May 14, 2026
    "MMM d, yyyy",  // May 14, 2026
    "yyyy/MM/dd",
    "yyyy.MM.dd",
  ];
  for (const fmt of formats) {
    const d = parse(s, fmt, today);
    if (isValid(d)) return d;
  }

  return null;
}

// ---------------------------------------------------------------------
// Value-normalization keys
// ---------------------------------------------------------------------

/** Case/separator-tolerant lookup key for status/priority maps. */
function normValue(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

// ---------------------------------------------------------------------
// Status synonyms → CanonicalStatus
// ---------------------------------------------------------------------

const STATUS_MAP: Record<string, CanonicalStatus> = {
  // Done
  done: "Done",
  complete: "Done",
  completed: "Done",
  finished: "Done",
  closed: "Done",
  resolved: "Done",
  shipped: "Done",
  delivered: "Done",
  "✓": "Done",

  // In Progress
  "in progress": "In Progress",
  doing: "In Progress",
  active: "In Progress",
  ongoing: "In Progress",
  wip: "In Progress",
  working: "In Progress",
  started: "In Progress",

  // Blocked
  blocked: "Blocked",
  stuck: "Blocked",
  waiting: "Blocked",
  "on hold": "Blocked",
  paused: "Blocked",
  impeded: "Blocked",

  // Not Started
  "not started": "Not Started",
  todo: "Not Started",
  "to do": "Not Started",
  backlog: "Not Started",
  new: "Not Started",
  open: "Not Started",
  pending: "Not Started",
};

export function normalizeStatus(raw: string): CanonicalStatus {
  if (!raw) return "Unknown";
  return STATUS_MAP[normValue(raw)] ?? "Unknown";
}

// ---------------------------------------------------------------------
// Priority synonyms → CanonicalPriority
// ---------------------------------------------------------------------

const PRIORITY_MAP: Record<string, CanonicalPriority> = {
  // Critical
  critical: "Critical",
  p0: "Critical",
  urgent: "Critical",
  asap: "Critical",
  highest: "Critical",
  red: "Critical",
  "1": "Critical",

  // High
  high: "High",
  p1: "High",
  important: "High",
  orange: "High",
  "2": "High",

  // Medium
  medium: "Medium",
  med: "Medium",
  p2: "Medium",
  normal: "Medium",
  yellow: "Medium",
  "3": "Medium",

  // Low
  low: "Low",
  p3: "Low",
  p4: "Low",
  lowest: "Low",
  green: "Low",
  "4": "Low",
  "5": "Low",
};

export function normalizePriority(raw: string): CanonicalPriority {
  if (!raw) return "Medium"; // spec default
  return PRIORITY_MAP[normValue(raw)] ?? "Medium";
}
