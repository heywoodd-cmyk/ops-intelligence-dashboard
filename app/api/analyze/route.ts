import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const client = new Anthropic();

export interface Task {
  task_id: string;
  task_name: string;
  assignee: string;
  status: string;
  priority: string;
  created_date: string;
  due_date: string;
  completed_date: string;
  department: string;
  category: string;
  estimated_hours: string;
  actual_hours: string;
}

export interface AnalysisResult {
  topPriority: string;
  summary: string;
  bottlenecks: string[];
  overduePatterns: string[];
  workloadIssues: string[];
  topRecommendations: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
}

// ---------------------------------------------------------------------------
// Pre-compute all key counts in TypeScript BEFORE calling Claude.
// These become ground-truth facts injected into the prompt so the model
// never re-derives counts from the raw task list.
// ---------------------------------------------------------------------------

interface PersonFacts {
  name: string;
  total: number;
  active: number;   // not done/completed
  overdue: number;  // past due date AND not done — same definition as global
  blocked: number;  // status === "Blocked"
}

interface Facts {
  today: string;
  total: number;
  done: number;
  inProgress: number;   // status === "In Progress" (may overlap with overdue)
  overdue: number;      // past due date AND not done/completed
  blocked: number;      // status === "Blocked"
  criticalOpen: number; // priority === "Critical" AND not done/completed
  overdueIds: string[];
  blockedIds: string[];
  perPerson: PersonFacts[];
}

function computeFacts(tasks: Task[], today: string): Facts {
  const isDone    = (t: Task) => t.status === "Done" || t.status === "Completed";
  const isOverdue = (t: Task) =>
    !!t.due_date && t.due_date < today && !isDone(t);

  const byAssignee: Record<string, Task[]> = {};
  tasks.forEach((t) => {
    if (!byAssignee[t.assignee]) byAssignee[t.assignee] = [];
    byAssignee[t.assignee].push(t);
  });

  return {
    today,
    total:        tasks.length,
    done:         tasks.filter(isDone).length,
    inProgress:   tasks.filter((t) => t.status === "In Progress").length,
    overdue:      tasks.filter(isOverdue).length,
    blocked:      tasks.filter((t) => t.status === "Blocked").length,
    criticalOpen: tasks.filter((t) => t.priority === "Critical" && !isDone(t)).length,
    overdueIds:   tasks.filter(isOverdue).map((t) => t.task_id),
    blockedIds:   tasks.filter((t) => t.status === "Blocked").map((t) => t.task_id),
    perPerson: Object.entries(byAssignee).map(([name, ts]) => ({
      name,
      total:   ts.length,
      active:  ts.filter((t) => !isDone(t)).length,
      overdue: ts.filter(isOverdue).length,
      blocked: ts.filter((t) => t.status === "Blocked").length,
    })),
  };
}

function buildPrompt(tasks: Task[]): string {
  const today = new Date().toISOString().split("T")[0];
  const f = computeFacts(tasks, today);

  // Format the per-person table for the prompt
  const personTable = f.perPerson
    .map(
      (p) =>
        `  ${p.name}: ${p.total} total | ${p.active} active | ${p.overdue} overdue | ${p.blocked} blocked`
    )
    .join("\n");

  const taskList = tasks
    .map(
      (t) =>
        `[${t.task_id}] "${t.task_name}" | ${t.assignee} | ${t.status} | ${t.priority} priority | due ${t.due_date || "N/A"} | dept: ${t.department}`
    )
    .join("\n");

  return `You are an operations analyst. Today is ${f.today}.

═══════════════════════════════════════════════════
GROUND-TRUTH COUNTS — computed from the data in code.
Use these exact integers verbatim. Never recount from the task list.
═══════════════════════════════════════════════════
  Total tasks   : ${f.total}
  Completed     : ${f.done}
  In progress   : ${f.inProgress}  (by status; may overlap with overdue)
  Overdue       : ${f.overdue}  (past due date, not done — any status)
  Blocked       : ${f.blocked}  (status = Blocked; distinct from overdue)
  Critical open : ${f.criticalOpen}  (priority = Critical, not done)

Per person:
${personTable}

Overdue task IDs  : ${f.overdueIds.join(", ") || "none"}
Blocked task IDs  : ${f.blockedIds.join(", ") || "none"}
═══════════════════════════════════════════════════

TASK LIST (for context — do not recount; use GROUND-TRUTH COUNTS above):
${taskList}

Respond ONLY with valid JSON matching this schema exactly:
{
  "topPriority": "<one sentence, max 15 words, the single most urgent thing to act on right now>",
  "summary": "<2 sentences max, plain English, what's broken and the main risk>",
  "bottlenecks": ["<finding>", "<finding>", "<finding>"],
  "overduePatterns": ["<finding>", "<finding>", "<finding>"],
  "workloadIssues": ["<finding>", "<finding>", "<finding>"],
  "topRecommendations": ["<action>", "<action>", "<action>"],
  "riskLevel": "low" | "medium" | "high" | "critical"
}

STRICT RULES — no exceptions:
1. Every string in every array: ONE sentence, MAX 20 words.
2. Start each finding with the number or fact. Example: "Devon has 4 blocked tasks, all in Security."
3. Include specific task IDs wherever relevant — especially in topRecommendations.
4. Each array must have EXACTLY 3 items.
5. topPriority: one sentence, max 15 words, name the specific person or task.
6. BANNED WORDS: cascading, critically, overloaded, throughput, systemic, escalation, bandwidth, capacity constraints, dependency chains, operational risk, compounding.

COUNT CONSISTENCY RULES:
7. Every number you write must come from GROUND-TRUTH COUNTS above. Do not derive counts from the task list.
8. If a count appears in more than one panel, use the identical integer and identical phrasing each time.
9. Never use vague language ("several", "multiple", "many") for any count that has an exact number in the table.
10. Overdue (${f.overdue}) and Blocked (${f.blocked}) are separate counts — do not conflate them. A task can be both, but the totals are tracked independently.
11. When describing a person, use their exact per-person row from the table (e.g. "James has 4 overdue tasks" if James.overdue = 4 — not "James has several").

GOOD examples:
✓ topPriority: "Unblock Devon's 4 blocked Security tasks — all are Critical priority."
✓ finding: "Devon has 4 of 7 active tasks blocked, all Critical."
✓ finding: "James has 4 overdue tasks, all in Procurement."
✓ recommendation: "Check in with Devon on T-004 and T-009 — both Critical and blocked."

BAD examples:
✗ "Devon is overloaded with cascading security dependencies."
✗ "Several tasks are overdue across multiple teams."
✗ "The procurement pipeline faces systemic issues." (vague — use the number)

riskLevel: "critical" if any blocked task is also Critical priority and overdue.`;
}

export async function POST(req: NextRequest) {
  try {
    const { tasks } = await req.json();

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
    }

    const prompt = buildPrompt(tasks);

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system:
        "You are a precise operations analyst. Respond with valid JSON only — no markdown, no prose. Every array item must be one sentence, max 20 words, plain English.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (message.stop_reason === "max_tokens") {
      throw new Error("Response truncated — increase max_tokens");
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No JSON in response. Raw: ${raw.slice(0, 200)}`);
    }

    const analysis: AnalysisResult = JSON.parse(jsonMatch[0]);

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze tasks" },
      { status: 500 }
    );
  }
}
