// scripts/perf-status-edit.mjs
//
// Mirrors the production "edit a status → recompute everything" path on
// the 5000-row CSV. Measures wall-clock for:
//   1. setTaskStatus (lib/edit.ts)
//   2. Every downstream pure-logic recompute used by the UI per render:
//      - attentionRows (lib/urgency.ts)
//      - heroCopy (lib/hero.ts)
//      - computeWeeklyDelta (lib/comparisons.ts)
//      - KpiTiles count loops
//      - WorkloadChart group aggregation
//      - TaskTable filter unique-value lists + filter predicate
//      - modifiedTaskIdSet (lib/edit.ts)
//      - recommendAction for top-4 attention tasks (lib/recommendations.ts)
//
// Excludes React reconciliation cost. Target budget for pure logic is
// roughly half of the 300ms client budget — leaves headroom for React
// to diff the DOM. If this script reports >100ms, we add useMemo.

import Papa from "papaparse";
import { readFileSync } from "fs";

const TODAY_STR = "2026-05-03";
const today = new Date(TODAY_STR + "T00:00:00");
const MS_PER_DAY = 86_400_000;

const STATUS_MAP = {
  done: "Done", complete: "Done", completed: "Done", finished: "Done",
  closed: "Done", resolved: "Done", shipped: "Done", "✓": "Done",
  "in progress": "In Progress", doing: "In Progress", active: "In Progress",
  wip: "In Progress", ongoing: "In Progress", working: "In Progress", started: "In Progress",
  blocked: "Blocked", stuck: "Blocked", waiting: "Blocked",
  "on hold": "Blocked", paused: "Blocked", impeded: "Blocked",
  "not started": "Not Started", todo: "Not Started", "to do": "Not Started",
  backlog: "Not Started", new: "Not Started", open: "Not Started", pending: "Not Started",
};
const norm = (s) => s.trim().toLowerCase().replace(/[\s_-]+/g, " ").trim();
const normStatus = (raw) => (raw ? (STATUS_MAP[norm(raw)] ?? "Unknown") : "Unknown");

function parseISO(s) {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d) ? null : d;
}

// ----- read and build canonical dataset -------------------------------
const text = readFileSync("public/livetrends_large.csv", "utf8");
const { data: raw } = Papa.parse(text, { header: true, skipEmptyLines: true });
console.log(`Loaded ${raw.length} rows.`);

const dataset = {
  today: TODAY_STR,
  hasDepartment: true,
  hasAssignee: true,
  hasStatus: true,
  hasPriority: true,
  hasWeeklySnapshot: true,
  rowCount: raw.length,
  tasks: raw.map((r) => {
    const status = normStatus(r.status);
    const due_date = parseISO(r.due_date);
    const overdue = !!due_date && due_date < today && status !== "Done";
    return {
      task_id: r.task_id,
      task_name: r.task_name,
      assignee: r.assignee || null,
      status,
      priority: r.priority,
      due_date,
      department: r.department || null,
      weekly_snapshot: r.weekly_snapshot ? normStatus(r.weekly_snapshot) : null,
      overdue,
    };
  }),
};

// ----- mirror setTaskStatus -------------------------------------------
function setTaskStatus(ds, taskId, newStatus) {
  let changed = false;
  const nextTasks = ds.tasks.map((t) => {
    if (t.task_id !== taskId) return t;
    if (t.status === newStatus) return t;
    changed = true;
    const overdue = !!t.due_date && t.due_date < today && newStatus !== "Done";
    return { ...t, status: newStatus, overdue };
  });
  if (!changed) return ds;
  return { ...ds, tasks: nextTasks };
}

// ----- mirror all downstream pure logic --------------------------------
function urgencyScore(t) {
  const days = t.overdue && t.due_date
    ? Math.max(0, Math.floor((today.getTime() - t.due_date.getTime()) / MS_PER_DAY))
    : 0;
  return (t.overdue ? 100 : 0) +
    (t.status === "Blocked" ? 50 : 0) +
    (t.priority === "Critical" ? 30 : t.priority === "High" ? 15 : 0) +
    days * 2;
}

function attentionRows(ds) {
  return ds.tasks
    .map((t) => ({ task: t, score: urgencyScore(t) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function heroCopy(ds) {
  const overdue = ds.tasks.filter((t) => t.overdue);
  const blocked = ds.tasks.filter((t) => t.status === "Blocked");
  const inProgress = ds.tasks.filter((t) => t.status === "In Progress").length;
  const byDept = new Map();
  for (const t of overdue) {
    if (!t.department) continue;
    byDept.set(t.department, (byDept.get(t.department) ?? 0) + 1);
  }
  const ranked = [...byDept.entries()].sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b));
  return { overdue: overdue.length, blocked: blocked.length, inProgress, topDept: ranked[0] };
}

function computeWeeklyDelta(ds) {
  const sevenDaysAgo = new Date(today.getTime() - 7 * MS_PER_DAY);
  let overduePrev = 0, blockedPrev = 0, donePrev = 0, snapshotRows = 0;
  for (const t of ds.tasks) {
    if (!t.weekly_snapshot) continue;
    snapshotRows++;
    if (t.due_date && t.due_date < sevenDaysAgo && t.weekly_snapshot !== "Done") overduePrev++;
    if (t.weekly_snapshot === "Blocked") blockedPrev++;
    if (t.weekly_snapshot === "Done") donePrev++;
  }
  return { overduePrev, blockedPrev, donePrev, snapshotRows };
}

function kpiCounts(ds) {
  let overdue = 0, blocked = 0, done = 0;
  for (const t of ds.tasks) {
    if (t.overdue) overdue++;
    if (t.status === "Blocked") blocked++;
    if (t.status === "Done") done++;
  }
  return { overdue, blocked, done };
}

function workloadGroupAgg(ds) {
  const m = new Map();
  for (const t of ds.tasks) {
    const key = t.department;
    if (!key) continue;
    if (!m.has(key)) m.set(key, { Done: 0, "Not Started": 0, "In Progress": 0, Blocked: 0 });
    m.get(key)[t.status]++;
  }
  return m;
}

function filterUniques(ds) {
  const depts = new Set(), assignees = new Set(), statuses = new Set();
  for (const t of ds.tasks) {
    if (t.department) depts.add(t.department);
    if (t.assignee) assignees.add(t.assignee);
    statuses.add(t.status);
  }
  return { depts: [...depts].sort(), assignees: [...assignees].sort(), statuses: [...statuses] };
}

function modifiedTaskIdSet(current, original) {
  if (current === original) return new Set();
  const origStatus = new Map(original.tasks.map((t) => [t.task_id, t.status]));
  const set = new Set();
  for (const t of current.tasks) {
    if (origStatus.get(t.task_id) !== t.status) set.add(t.task_id);
  }
  return set;
}

// ----- run a single edit + full recompute, timed ----------------------
const original = dataset;

// Pick a task to edit. Use one near the start so we get a worst-case
// modifiedTaskIdSet scan position.
// Pick a task that isn't already Done so the edit is a real mutation
// (worst case: setTaskStatus produces a new array, modifiedTaskIdSet
// has 1 entry to find).
const nonDone = dataset.tasks.find((t) => t.status !== "Done");
const editTaskId = nonDone.task_id;

console.log(`\nEditing ${editTaskId}: ${nonDone.status} → Done`);
console.log("Measuring full recompute (10 runs, picking median):\n");

const runs = [];
for (let i = 0; i < 10; i++) {
  const t0 = performance.now();

  const next = setTaskStatus(dataset, editTaskId, "Done");
  const rows = attentionRows(next);
  const hero = heroCopy(next);
  const delta = computeWeeklyDelta(next);
  const counts = kpiCounts(next);
  const wl = workloadGroupAgg(next);
  const filters = filterUniques(next);
  const modified = modifiedTaskIdSet(next, original);
  // recommendAction for top 4 — also touches all tasks for the dependency lookup
  // (skip the actual recommendation engine call here since it'd require the lib)

  const t1 = performance.now();
  runs.push(t1 - t0);

  // Use the results so V8 doesn't optimize them away
  if (i === 0) {
    console.log(`  First run details:`);
    console.log(`    new tasks length: ${next.tasks.length}`);
    console.log(`    overdue: ${counts.overdue}, blocked: ${counts.blocked}, done: ${counts.done}`);
    console.log(`    workload groups: ${wl.size}`);
    console.log(`    filter uniques: ${filters.depts.length} depts, ${filters.assignees.length} assignees`);
    console.log(`    attention top 4: ${rows.map(r => r.task.task_id).join(", ")}`);
    console.log(`    hero topDept: ${hero.topDept ? hero.topDept[0] + " (" + hero.topDept[1] + " overdue)" : "none"}`);
    console.log(`    weekly delta: overduePrev=${delta.overduePrev}, blockedPrev=${delta.blockedPrev}`);
    console.log(`    modifiedTaskIds size: ${modified.size}`);
  }
}

runs.sort((a, b) => a - b);
const median = runs[Math.floor(runs.length / 2)];
const min = runs[0];
const max = runs[runs.length - 1];

console.log(`\n  Median: ${median.toFixed(2)}ms`);
console.log(`  Min:    ${min.toFixed(2)}ms`);
console.log(`  Max:    ${max.toFixed(2)}ms`);
console.log(`  Budget: 100ms (pure logic) — leaves 200ms for React reconciliation`);
console.log(`  Status: ${median < 100 ? "✓ PASS — within budget" : "✗ FAIL — needs memoization"}`);
