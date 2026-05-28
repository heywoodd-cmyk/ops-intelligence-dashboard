// scripts/generate-livetrends-large.mjs
//
// Generates public/livetrends_large.csv — 5000 rows of synthetic
// operational tasks for performance verification of the editable
// status feature. Seeded RNG so the file is reproducible across runs.
//
// Run once:  node scripts/generate-livetrends-large.mjs
// Then move on; the CSV stays committed.

import { writeFileSync } from "fs";

// ----- seeded RNG -----------------------------------------------------
function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const weighted = (arr, weights) => {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < arr.length; i++) {
    acc += weights[i];
    if (r < acc) return arr[i];
  }
  return arr[arr.length - 1];
};

// ----- domain data ----------------------------------------------------
const DEPARTMENTS = {
  Engineering: ["Priya Nair", "Alex Wang", "Sam Khoury", "Jordan Bell", "Maya Park"],
  Product: ["Maya Chen", "Ben Hartley", "Lila Zheng", "Cara Singh"],
  Operations: ["James Liu", "Devon Reyes", "Tara Okonkwo"],
  Security: ["Devon Park", "Sasha Mendel"],
  HR: ["Jordan West", "Nina Patel", "Owen Briggs"],
  Marketing: ["Riley Kim", "Maya Iwata", "Carlos Vega"],
  Finance: ["Wendy Lee", "Anita Rao"],
  Sales: ["Marcus Tate", "Yumi Tanaka", "Erik Andersson"],
};
const DEPT_NAMES = Object.keys(DEPARTMENTS);

const VERBS = [
  "Implement", "Migrate", "Audit", "Review", "Plan", "Negotiate",
  "Refactor", "Document", "Investigate", "Test", "Launch", "Onboard",
  "Roll out", "Decommission", "Optimize", "Update", "Configure",
  "Coordinate", "Draft", "Approve", "Validate",
];
const NOUNS = [
  "dashboard", "pipeline", "rollout", "policy", "playbook", "runbook",
  "integration", "report", "campaign", "audit", "renewal", "review",
  "rollout", "migration", "training", "spec", "rubric", "framework",
  "service", "workflow", "checklist",
];
const QUALIFIERS = [
  "for Q3", "v2", "in EU region", "for new hires", "across teams",
  "for partners", "follow-up", "phase 2", "annual", "Q1",
  "for legal review", "after incident #47", "for executive sync",
  "kickoff", "wrap-up", "consolidation",
];

const STATUSES = ["Done", "In Progress", "Blocked", "Not Started"];
const STATUS_WEIGHTS = [0.32, 0.34, 0.09, 0.25];
// (Skipping "Unknown" — wouldn't appear in cleanly-collected real data.)

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const PRIORITY_WEIGHTS = [0.04, 0.22, 0.55, 0.19];

// ----- helpers --------------------------------------------------------
const TODAY = new Date("2026-05-03");
function dateOffset(days) {
  const d = new Date(TODAY.getTime() + days * 86_400_000);
  return d.toISOString().split("T")[0];
}

// Realistic snapshot: most tasks stayed the same a week ago; a minority
// transitioned in plausible ways (started, completed, became blocked,
// got reopened).
function snapshotFor(status) {
  const r = rng();
  if (r < 0.82) return status;
  switch (status) {
    case "Done":         return pick(["In Progress", "Blocked"]);
    case "Blocked":      return "In Progress";
    case "In Progress":  return pick(["Not Started", "Done"]);
    case "Not Started":  return "Not Started";
    default:             return status;
  }
}

// CSV escaping for fields that contain commas, quotes, or newlines.
function csvField(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ----- generate -------------------------------------------------------
const N = 5000;
const rows = [];

for (let i = 1; i <= N; i++) {
  const dept = pick(DEPT_NAMES);
  const assignee = pick(DEPARTMENTS[dept]);
  const status = weighted(STATUSES, STATUS_WEIGHTS);
  const priority = weighted(PRIORITIES, PRIORITY_WEIGHTS);
  const name = `${pick(VERBS)} ${pick(NOUNS)} ${pick(QUALIFIERS)}`;
  // ±90 day spread around today, slightly biased towards past (so we
  // get realistic overdue density).
  const dueOffset = Math.floor((rng() - 0.55) * 180);
  const due_date = dateOffset(dueOffset);
  const created_date = dateOffset(-Math.floor(rng() * 120) - 1);
  const completed_date =
    status === "Done" ? dateOffset(-Math.floor(rng() * 60) - 1) : "";
  const snapshot = snapshotFor(status);

  rows.push({
    task_id: `T-${String(i).padStart(4, "0")}`,
    task_name: name,
    assignee,
    status,
    priority,
    due_date,
    created_date,
    completed_date,
    department: dept,
    weekly_snapshot: snapshot,
  });
}

// ----- write CSV ------------------------------------------------------
const headers = [
  "task_id", "task_name", "assignee", "status", "priority",
  "due_date", "created_date", "completed_date", "department",
  "weekly_snapshot",
];
const lines = [headers.join(",")];
for (const r of rows) {
  lines.push(headers.map((h) => csvField(r[h])).join(","));
}
const csv = lines.join("\n") + "\n";
writeFileSync("public/livetrends_large.csv", csv, "utf8");

// ----- summary --------------------------------------------------------
const counts = { Done: 0, "In Progress": 0, Blocked: 0, "Not Started": 0 };
const overdue = [];
for (const r of rows) {
  counts[r.status]++;
  if (r.due_date < "2026-05-03" && r.status !== "Done") overdue.push(r);
}
console.log(`Wrote public/livetrends_large.csv (${N} rows).`);
console.log("Status distribution:");
for (const [s, n] of Object.entries(counts)) {
  console.log(`  ${s.padEnd(13)}: ${n} (${((n / N) * 100).toFixed(1)}%)`);
}
console.log(`Overdue (derived): ${overdue.length} (${((overdue.length / N) * 100).toFixed(1)}%)`);
console.log(`Departments: ${DEPT_NAMES.length} | Assignees: ${Object.values(DEPARTMENTS).flat().length}`);
