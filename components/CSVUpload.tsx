"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, Loader2 } from "lucide-react";
import {
  CANONICAL_FIELDS,
  matchColumns,
  mergeAIMapping,
  normalizeDataset,
  type CanonicalField,
  type NormalizedDataset,
} from "@/lib/schema";

interface CSVUploadProps {
  /** Emitted once the full pipeline (parse → match → AI fallback → normalize) finishes. */
  onDataset: (dataset: NormalizedDataset) => void;
}

const NOT_A_TASK_LIST_MSG =
  "That doesn't look like a task list. Try a CSV with columns like task, status, owner, or due date.";

const ROSE = "rgba(244, 63, 94, 0.9)";

/**
 * Single-pipeline upload. Every CSV runs:
 *   1. PapaParse → row objects
 *   2. matchColumns (deterministic alias match)
 *   3. /api/map-columns for any unresolved headers (silent fallback if it fails)
 *   4. normalizeDataset → canonical NormalizedDataset
 *
 * Gracefully refuses bad uploads (non-CSV, empty, or clearly not a task
 * list — no task_name or task_id resolved) with a friendly message
 * below the dropzone. The dropzone stays visible so the user can drop
 * a different file without restarting the flow.
 */
export function CSVUpload({ onDataset }: CSVUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fail = (message: string) => {
    setLoading(null);
    setError(message);
  };

  const runPipeline = async (rawRows: Record<string, string>[]) => {
    if (rawRows.length === 0) {
      fail(NOT_A_TASK_LIST_MSG);
      return;
    }

    setLoading("Reading columns…");
    const match = matchColumns(rawRows);
    let finalMap = match.resolved;
    const aiMappedFields: CanonicalField[] = [];

    if (match.unresolved.length > 0) {
      setLoading("Mapping unfamiliar columns with Claude…");
      try {
        const res = await fetch("/api/map-columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unresolvedColumns: match.unresolved }),
        });
        if (res.ok) {
          const { mapping } = (await res.json()) as {
            mapping: Record<string, CanonicalField | "ignore">;
          };
          for (const [, field] of Object.entries(mapping)) {
            if (field === "ignore") continue;
            if (!(CANONICAL_FIELDS as readonly string[]).includes(field))
              continue;
            const f = field as CanonicalField;
            if (match.resolved[f]) continue;
            if (aiMappedFields.includes(f)) continue;
            aiMappedFields.push(f);
          }
          finalMap = mergeAIMapping(match.resolved, mapping);
        }
      } catch {
        /* silent fallback */
      }
    }

    // Sanity check: if neither task_name nor task_id resolved to a real
    // source column, this clearly isn't a task list.
    if (!finalMap.task_name && !finalMap.task_id) {
      fail(NOT_A_TASK_LIST_MSG);
      return;
    }

    setLoading("Normalizing dataset…");
    const dataset = normalizeDataset(rawRows, finalMap);
    setLoading(null);
    setError(null);
    // rawRowCount feeds the reconciliation strip below the KPI row.
    // Pipeline currently never drops rows, so loaded === counted, but
    // wiring the value through proves it.
    onDataset({
      ...dataset,
      rawRowCount: rawRows.length,
      aiMappedFields,
    });
  };

  const parseFile = (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      fail(NOT_A_TASK_LIST_MSG);
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        // PapaParse rarely throws; it reports issues via result.errors.
        // Treat the file as unparseable when no data came back at all.
        if (!result.data || result.data.length === 0) {
          fail(NOT_A_TASK_LIST_MSG);
          return;
        }
        runPipeline(result.data);
      },
      error: () => fail(NOT_A_TASK_LIST_MSG),
    });
  };

  const loadSampleFile = async (filename: string) => {
    setError(null);
    setLoading("Loading sample…");
    try {
      const res = await fetch(`/${filename}`);
      if (!res.ok) {
        fail(NOT_A_TASK_LIST_MSG);
        return;
      }
      const text = await res.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      runPipeline(result.data);
    } catch {
      fail(NOT_A_TASK_LIST_MSG);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4">
      {/* Plain-language intro for non-technical viewers. */}
      <p className="text-base text-zinc-400 text-center max-w-xl leading-relaxed">
        Upload a list of your team&apos;s tasks. This turns it into a clear
        picture of what&apos;s overdue, what&apos;s stuck, and what to do next.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`w-full max-w-xl rounded-md border border-dashed cursor-pointer transition-colors p-10 text-center ${
          dragging
            ? "border-violet-500 bg-violet-950/10"
            : "border-card-border bg-card hover:border-zinc-700"
        }`}
      >
        <Upload className="w-5 h-5 text-muted mx-auto mb-4" />
        <p className="text-sm text-primary mb-1.5">
          Drop CSV here or click to browse
        </p>
        <p className="text-xs text-muted">
          Your file doesn&apos;t need a specific format. Whatever columns you
          have, the tool figures them out.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {error && (
        <p
          className="text-sm text-center max-w-xl"
          style={{ color: ROSE }}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 text-muted text-xs">
        <span className="h-px w-12 bg-card-border" />
        <span>or load a sample</span>
        <span className="h-px w-12 bg-card-border" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <SampleButton
            label="Clean sample"
            onClick={() => loadSampleFile("sample-clean.csv")}
            disabled={loading !== null}
            primary
          />
          <SampleButton
            label="Messy sample"
            onClick={() => loadSampleFile("sample-messy.csv")}
            disabled={loading !== null}
          />
          <SampleButton
            label="Sparse sample"
            onClick={() => loadSampleFile("sample-sparse.csv")}
            disabled={loading !== null}
          />
        </div>
        <p className="text-xs text-zinc-500">
          New here? Start with Clean sample.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {loading}
        </div>
      )}
    </div>
  );
}

function SampleButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "text-sm font-medium px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          : "text-sm text-secondary px-4 py-2 rounded-md hover:bg-card-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      }
    >
      {label}
    </button>
  );
}
