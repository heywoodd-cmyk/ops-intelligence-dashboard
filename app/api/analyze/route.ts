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

function buildPrompt(tasks: Task[]): string {
  const today = new Date().toISOString().split("T")[0];

  const overdue = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date < today &&
      t.status !== "Done" &&
      t.status !== "Completed"
  );

  const blocked = tasks.filter((t) => t.status === "Blocked");

  const byAssignee: Record<string, Task[]> = {};
  tasks.forEach((t) => {
    if (!byAssignee[t.assignee]) byAssignee[t.assignee] = [];
    byAssignee[t.assignee].push(t);
  });

  const workloadSummary = Object.entries(byAssignee)
    .map(([name, ts]) => {
      const active = ts.filter(
        (t) => t.status !== "Done" && t.status !== "Completed"
      );
      return `${name}: ${ts.length} total, ${active.length} active, ${ts.filter((t) => t.status === "Blocked").length} blocked`;
    })
    .join("\n");

  const taskList = tasks
    .map(
      (t) =>
        `[${t.task_id}] "${t.task_name}" | ${t.assignee} | ${t.status} | ${t.priority} priority | due ${t.due_date || "N/A"} | dept: ${t.department} | ${t.estimated_hours}h est / ${t.actual_hours}h actual`
    )
    .join("\n");

  return `You are an operations analyst. Today is ${today}.

DATA:
${workloadSummary}

OVERDUE (${overdue.length}): ${overdue.map((t) => t.task_id).join(", ")}
BLOCKED (${blocked.length}): ${blocked.map((t) => t.task_id).join(", ")}

TASKS:
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
3. Include specific task IDs (e.g. T-004) wherever relevant — especially in topRecommendations.
4. Each array must have EXACTLY 3 items.
5. topPriority: one sentence, max 15 words, name the specific person or task.
6. BANNED WORDS — do not use any of these: cascading, critically, overloaded, bottleneck dependencies, throughput, systemic, escalation, bandwidth, capacity constraints, dependency chains, operational risk, blocker dependencies, compounding.

GOOD examples (write like this):
✓ topPriority: "Unblock Devon's 4 Security tasks — they're all Critical and overdue."
✓ finding: "Devon has 4 of 5 active tasks blocked, all Critical priority."
✓ finding: "James has 4 overdue tasks, all in Procurement with no progress logged."
✓ recommendation: "Check in with Devon on T-004 and T-009 this week — both are Critical and blocked."

BAD examples (never write like this):
✗ "Devon Park is critically overloaded with cascading security dependencies impacting throughput."
✗ "The procurement pipeline faces systemic bottlenecks requiring immediate escalation."
✗ "Operational bandwidth constraints are creating compounding delivery risks."

riskLevel: use "critical" if there are blocked Critical-priority tasks that are also overdue.`;
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
