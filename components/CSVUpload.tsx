"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Task } from "@/app/api/analyze/route";
import {
  isCanonicalCSV,
  canonicalRowsToTasks,
} from "@/lib/schema";
import { Upload, FileText } from "lucide-react";

interface CSVUploadProps {
  /** Called when CSV matches the canonical schema (fallback path — instant load). */
  onCanonicalData: (tasks: Task[]) => void;
  /** Called when CSV needs schema mapping. Parent triggers the AI mapping call. */
  onRawData: (
    rawData: Record<string, string>[],
    rawHeaders: string[]
  ) => void;
}

export function CSVUpload({ onCanonicalData, onRawData }: CSVUploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleParsed = (rows: Record<string, string>[]) => {
    if (rows.length === 0) return;
    if (isCanonicalCSV(rows)) {
      onCanonicalData(canonicalRowsToTasks(rows));
    } else {
      const headers = Object.keys(rows[0]);
      onRawData(rows, headers);
    }
  };

  const parseFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => handleParsed(result.data),
    });
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

  const loadSample = async () => {
    const res = await fetch("/sample.csv");
    const text = await res.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    handleParsed(result.data);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] gap-5 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-[#d0d8ec]">
          Upload your operations CSV
        </h2>
        <p className="text-muted text-sm max-w-sm">
          Drop in a CSV of tasks, assignees, and due dates. Mismatched columns
          or status values will be mapped to the canonical schema before the
          dashboard loads.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`w-full max-w-md rounded-2xl border-2 border-dashed cursor-pointer transition-all p-10 text-center ${
          dragging
            ? "border-violet-500/50 bg-violet-950/20"
            : "border-[#1c2235] bg-card hover:border-[#2d3450] hover:bg-[#131825]"
        }`}
      >
        <Upload className="w-6 h-6 text-muted mx-auto mb-3" />
        <p className="text-[#8b96b0] text-sm font-medium">
          Drop CSV here or click to browse
        </p>
        <p className="text-muted text-xs mt-1.5">
          Any column names — we&apos;ll map them to the canonical schema.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="flex items-center gap-3 text-muted">
        <span className="h-px w-12 bg-[#1c2235]" />
        <span className="text-xs">or</span>
        <span className="h-px w-12 bg-[#1c2235]" />
      </div>

      <button
        onClick={loadSample}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white font-medium text-sm transition-colors"
      >
        <FileText className="w-4 h-4" />
        Load Sample Dataset
      </button>

      <p className="text-[#4a5568] text-xs text-center max-w-xs">
        35-task sample across Engineering, Product, Operations, Security & HR —
        canonical schema, loads instantly.
      </p>
    </div>
  );
}
