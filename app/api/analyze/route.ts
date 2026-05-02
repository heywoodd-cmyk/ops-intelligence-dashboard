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

  return `You are an operations analyst. Today's date is ${today}.

Analyze the following operational task data and produce a structured JSON response.

WORKLOAD SUMMARY:
${workloadSummary}

OVERDUE TASKS (${overdue.length}): ${overdue.map((t) => t.task_id).join(", ")}
BLOCKED TASKS (${blocked.length}): ${blocked.map((t) => t.task_id).join(", ")}

ALL TASKS:
${taskList}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "summary": "2-3 sentence plain-language executive summary of what's broken and what needs immediate attention",
  "bottlenecks": ["specific bottleneck finding 1", "specific bottleneck finding 2", ...],
  "overduePatterns": ["specific overdue pattern 1", "specific overdue pattern 2", ...],
  "workloadIssues": ["workload issue 1", "workload issue 2", ...],
  "topRecommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "riskLevel": "low" | "medium" | "high" | "critical"
}

Guidelines:
- Be specific: name assignees, task IDs, and departments
- bottlenecks: identify where work is piling up or stalled (2-4 items)
- overduePatterns: identify patterns in what's late (2-3 items)
- workloadIssues: flag imbalanced or overloaded individuals (2-3 items)
- topRecommendations: the 3 most impactful things to do THIS WEEK
- riskLevel: overall operational health (critical if multiple blocked+overdue critical tasks)`;
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
        "You are a precise operations analyst. Always respond with valid JSON only, no markdown, no explanation. Keep each string value concise (under 120 characters).",
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
