import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  LEGACY_CANONICAL_FIELDS as CANONICAL_FIELDS,
  LEGACY_CANONICAL_STATUSES as CANONICAL_STATUSES,
  ProposedMapping,
} from "@/lib/schema";

export const maxDuration = 30;

const client = new Anthropic();

/**
 * AI proposes column and status-value mappings on a small sample.
 * It does NOT count, categorize, or analyze the data — only suggest matches.
 * The deterministic reshape happens client-side after user confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const { headers, sampleRows } = (await req.json()) as {
      headers: string[];
      sampleRows: Record<string, string>[];
    };

    if (!Array.isArray(headers) || !Array.isArray(sampleRows)) {
      return NextResponse.json(
        { error: "Expected { headers: string[], sampleRows: object[] }" },
        { status: 400 }
      );
    }

    // Cap to first 5 rows defensively — AI never sees the full dataset.
    const sample = sampleRows.slice(0, 5);

    const prompt = `You are a CSV schema mapper. Map uploaded columns and status values to a fixed canonical schema. You will NOT count, summarize, or analyze any data — only propose mappings.

CANONICAL FIELDS (target columns):
${CANONICAL_FIELDS.join(", ")}

CANONICAL STATUS VALUES (the only allowed status outputs):
${CANONICAL_STATUSES.join(", ")}

UPLOADED CSV HEADERS:
${headers.join(", ")}

SAMPLE ROWS (first ${sample.length}, for context only):
${sample.map((r, i) => `Row ${i + 1}: ${JSON.stringify(r)}`).join("\n")}

Respond with ONLY a JSON object (no markdown, no prose, no fences):
{
  "column_map": {
${CANONICAL_FIELDS.map((f) => `    "${f}": "<exact CSV header or null>"`).join(",\n")}
  },
  "status_value_map": {
    "<every distinct non-empty value in the status column>": "<one of: ${CANONICAL_STATUSES.join(", ")} — or null if unclear>"
  }
}

Rules:
1. column_map values must be EXACT strings from UPLOADED CSV HEADERS, or null. Never invent a header.
2. Every canonical field must appear as a key in column_map (with null if no match).
3. status_value_map keys must be the distinct status values you observe in the sample's mapped status column. If you can't tell which column is status, return an empty status_value_map.
4. status_value_map values must be one of the 4 canonical statuses or null. Never use "Overdue" — that is a flag, not a status.
5. Do NOT include any other keys, commentary, counts, or analysis.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        "You map CSV columns and status values to a canonical schema. Respond with valid JSON only — no markdown, no prose, no fences. Never count or analyze data.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (message.stop_reason === "max_tokens") {
      throw new Error("Mapping response truncated");
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const mapping = JSON.parse(jsonMatch[0]) as ProposedMapping;
    return NextResponse.json(mapping);
  } catch (err) {
    console.error("Schema mapping error:", err);
    return NextResponse.json(
      { error: "Mapping suggestion failed" },
      { status: 500 }
    );
  }
}
