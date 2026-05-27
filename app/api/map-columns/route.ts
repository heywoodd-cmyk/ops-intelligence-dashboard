import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { CANONICAL_FIELDS, type CanonicalField } from "@/lib/schema";

export const maxDuration = 30;

const client = new Anthropic();

// ---------------------------------------------------------------------
// AI fallback for unresolved columns ONLY.
// Deterministic alias matching (lib/schema.ts → matchColumns) covers the
// common cases; this endpoint is invoked only with leftovers — headers
// that didn't match any alias.
//
// Contract: AI classifies headers into canonical fields, or "ignore".
// AI never sees the full dataset, never counts, never analyzes content.
// ---------------------------------------------------------------------

interface UnresolvedColumnInput {
  header: string;
  samples: string[]; // up to 3 sample values from the first rows
}

export async function POST(req: NextRequest) {
  try {
    const { unresolvedColumns } = (await req.json()) as {
      unresolvedColumns: UnresolvedColumnInput[];
    };

    if (
      !Array.isArray(unresolvedColumns) ||
      unresolvedColumns.length === 0
    ) {
      // Nothing to classify — empty mapping, 200.
      return NextResponse.json({ mapping: {} });
    }

    // Defensive cap — never send Claude more than 25 unresolved columns
    // (real CSVs almost never exceed this) or more than 3 samples each.
    const safeColumns = unresolvedColumns.slice(0, 25).map((c) => ({
      header: c.header,
      samples: (c.samples ?? []).slice(0, 3),
    }));

    const allowedValues = [...CANONICAL_FIELDS, "ignore"] as const;

    const prompt = `Classify each uploaded CSV column into one of the canonical fields below — or "ignore" if it doesn't clearly fit any. Do NOT count, summarize, or analyze the data. Just classify.

CANONICAL FIELDS:
${CANONICAL_FIELDS.join(", ")}

UNRESOLVED COLUMNS:
${safeColumns
  .map(
    (c) =>
      `  "${c.header}" — samples: ${c.samples.length ? c.samples.map((s) => `"${s}"`).join(", ") : "(empty)"}`
  )
  .join("\n")}

Respond with ONLY a JSON object (no markdown, no prose, no fences):
{
  "mapping": {
    "<header>": "<canonical field name>" | "ignore"
  }
}

Rules:
1. Keys must be the EXACT header strings from UNRESOLVED COLUMNS.
2. Values must be EXACTLY one of: ${allowedValues.join(", ")}.
3. Use "ignore" if a column doesn't clearly belong to any canonical field — never guess.
4. Each canonical field may appear at most once across the values (no two headers map to the same field).
5. Do not invent canonical fields. Do not include commentary.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system:
        "You classify CSV columns into a canonical schema. Respond with valid JSON only — no markdown, no prose, no fences. Never count or analyze data.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (message.stop_reason === "max_tokens") {
      throw new Error("Mapping response truncated");
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      mapping?: Record<string, string>;
    };
    const aiMapping = parsed.mapping ?? {};

    // Sanitize: drop entries whose value isn't a canonical field or "ignore",
    // and drop entries whose header isn't in the input set. Frontend will
    // also enforce these rules, but defense in depth.
    const allowed = new Set<string>(allowedValues);
    const inputHeaders = new Set(safeColumns.map((c) => c.header));
    const seenFields = new Set<CanonicalField>();
    const clean: Record<string, string> = {};
    for (const [header, value] of Object.entries(aiMapping)) {
      if (!inputHeaders.has(header)) continue;
      if (!allowed.has(value)) continue;
      if (value === "ignore") {
        clean[header] = "ignore";
        continue;
      }
      const field = value as CanonicalField;
      if (seenFields.has(field)) continue; // dedupe per rule #4
      seenFields.add(field);
      clean[header] = field;
    }

    return NextResponse.json({ mapping: clean });
  } catch (err) {
    console.error("Map-columns error:", err);
    return NextResponse.json(
      { error: "Mapping failed" },
      { status: 500 }
    );
  }
}
