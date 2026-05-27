"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, Loader2 } from "lucide-react";
import {
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

/**
 * Single-pipeline upload. Every CSV runs:
 *   1. PapaParse → row objects
 *   2. matchColumns (deterministic alias match)
 *   3. /api/map-columns for any unresolved headers (silent fallback if it fails)
 *   4. normalizeDataset → canonical NormalizedDataset
 *
 * No mapping confirmation screen, no validation screen. The DataQualityBadge
 * in the header surfaces what was mapped/inferred/missing.
 */
export function CSVUpload({ onDataset }: CSVUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState<string | null>(null); // status label
  const inputRef = useRef<HTMLInputElement>(null);

  const runPipeline = async (rawRows: Record<string, string>[]) => {
    if (rawRows.length === 0) return;

    setLoading("Reading columns…");
    const match = matchColumns(rawRows);
    let finalMap = match.resolved;

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
          finalMap = mergeAIMapping(match.resolved, mapping);
        }
        // On non-OK or network failure: keep deterministic-only mapping.
        // Missing fields surface in the Data Quality badge — no crash.
      } catch {
        /* silent fallback */
      }
    }

    setLoading("Normalizing dataset…");
    const dataset = normalizeDataset(rawRows, finalMap);
    setLoading(null);
    onDataset(dataset);
  };

  const parseFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => runPipeline(result.data),
    });
  };

  const loadSampleFile = async (filename: string) => {
    setLoading("Loading sample…");
    try {
      const res = await fetch(`/${filename}`);
      if (!res.ok) {
        setLoading(null);
        // eslint-disable-next-line no-alert
        alert(
          `${filename} isn't available yet. (Generated in Phase 4 of the refactor.)`
        );
        return;
      }
      const text = await res.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      runPipeline(result.data);
    } catch {
      setLoading(null);
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
    if (file && file.name.endsWith(".csv")) parseFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4">
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
          Any column names — unrecognized ones get mapped automatically.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="flex items-center gap-3 text-muted text-xs">
        <span className="h-px w-12 bg-card-border" />
        <span>or load a sample</span>
        <span className="h-px w-12 bg-card-border" />
      </div>

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
