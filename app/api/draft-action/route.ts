import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const client = new Anthropic();

// ---------------------------------------------------------------------
// /api/draft-action — Claude Haiku drafts a Slack-style message based
// on a specific slice of operational tasks. Three action types:
//   - department_brief   → message to a department lead
//   - individual_message → direct message to a single assignee
//   - standup_agenda     → 4-bullet agenda from blocked/overdue tasks
//
// The client computes the task slice + days_overdue per task and posts
// the full context. The route does not re-derive counts.
// ---------------------------------------------------------------------

type ActionType =
  | "department_brief"
  | "individual_message"
  | "standup_agenda";

interface TaskContextItem {
  task_id: string;
  task_name: string;
  status: string;
  priority: string;
  days_overdue: number;
  assignee: string | null;
  department: string | null;
}

interface ActionContext {
  department?: string;
  assignee?: string;
  tasks: TaskContextItem[];
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

/** Identify the implied team lead = the assignee with the most tasks
 *  in this slice. Used only for department_brief addressing. */
function inferLead(tasks: TaskContextItem[]): string | null {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.assignee) continue;
    counts.set(t.assignee, (counts.get(t.assignee) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let lead: string | null = null;
  let leadCount = -1;
  for (const [name, c] of counts.entries()) {
    if (c > leadCount) {
      lead = name;
      leadCount = c;
    }
  }
  return lead;
}

function formatTaskList(tasks: TaskContextItem[]): string {
  return tasks
    .map(
      (t) =>
        `  - ${t.task_id} "${t.task_name}" | status: ${t.status} | priority: ${t.priority} | ${t.days_overdue} days overdue | assignee: ${t.assignee ?? "Unassigned"}`
    )
    .join("\n");
}

function buildPrompt(actionType: ActionType, context: ActionContext): string {
  const taskList = formatTaskList(context.tasks);
  const count = context.tasks.length;

  if (actionType === "department_brief") {
    const lead = inferLead(context.tasks);
    const leadInstruction = lead
      ? `Use the team lead's first name once at the start. The lead is ${firstName(lead)}.`
      : `Address the team broadly — no specific name.`;

    return `Draft a brief Slack message from an operations manager to the ${context.department ?? "team"} team lead about the following blocked or overdue tasks (${count} total).

Tone: warm, direct, problem-solving. Under 100 words. End with a question that opens the conversation rather than an order. ${leadInstruction} No greeting block beyond that. Reference specific task IDs where it helps.

Tasks:
${taskList}

Write the message only. No preface, no explanation, no quotes around it.`;
  }

  if (actionType === "individual_message") {
    const name = context.assignee ? firstName(context.assignee) : "the assignee";
    return `Draft a brief Slack message from an operations manager to ${name} directly about the following blocked or overdue tasks they own (${count} total).

Tone: warm, direct, problem-solving. Under 100 words. End with a question that opens the conversation rather than an order. Use ${name} once at the start. No greeting block beyond that. Reference specific task IDs where it helps.

Tasks:
${taskList}

Write the message only. No preface, no explanation, no quotes around it.`;
  }

  // standup_agenda
  return `Draft a 4-bullet agenda for Monday standup based on these overdue or blocked tasks (${count} total).

Each bullet is one sentence, names the task ID, and ends with a question to discuss. Under 80 words total. Bullets use a leading "- " marker. If fewer than 4 distinct tasks warrant a bullet, write fewer bullets — do not pad.

Tasks:
${taskList}

Write the bullets only. No preface, no explanation, no closing line.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action_type: ActionType;
      context: ActionContext;
    };

    if (!body.action_type || !body.context) {
      return NextResponse.json(
        { error: "Expected { action_type, context: { tasks: [...] } }" },
        { status: 400 }
      );
    }
    if (
      !["department_brief", "individual_message", "standup_agenda"].includes(
        body.action_type
      )
    ) {
      return NextResponse.json(
        { error: "Invalid action_type" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.context.tasks) || body.context.tasks.length === 0) {
      return NextResponse.json(
        { error: "context.tasks must be a non-empty array" },
        { status: 400 }
      );
    }

    // Cap context defensively — Claude doesn't need every task in the
    // dataset, just the most urgent ones. 20 tasks is plenty.
    const tasks = body.context.tasks.slice(0, 20);
    const prompt = buildPrompt(body.action_type, {
      ...body.context,
      tasks,
    });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system:
        "You write short, warm, direct Slack messages and standup agendas for an operations manager. No preamble, no quotes, no markdown headers. Just the message text.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    if (message.stop_reason === "max_tokens") {
      throw new Error("Draft response truncated");
    }
    if (!raw.trim()) {
      throw new Error("Empty draft");
    }

    return NextResponse.json({ message: raw.trim() });
  } catch (err) {
    console.error("Draft action error:", err);
    return NextResponse.json(
      { error: "Could not draft message" },
      { status: 500 }
    );
  }
}
