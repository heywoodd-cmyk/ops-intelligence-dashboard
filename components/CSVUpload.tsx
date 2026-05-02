"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Task } from "@/app/api/analyze/route";
import { Upload, FileText } from "lucide-react";

interface CSVUploadProps {
  onData: (tasks: Task[]) => void;
}

export function CSVUpload({ onData }: CSVUploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = (file: File) => {
    Papa.parse<Task>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        onData(result.data);
      },
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
    const result = Papa.parse<Task>(text, { header: true, skipEmptyLines: true });
    onData(result.data);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          Ops Intelligence Dashboard
        </h2>
        <p className="text-slate-400 max-w-md">
          Upload a CSV of operational tasks to surface AI-powered insights,
          bottlenecks, and workload patterns.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`w-full max-w-md rounded-2xl border-2 border-dashed cursor-pointer transition-all p-10 text-center ${
          dragging
            ? "border-indigo-500 bg-indigo-900/20"
            : "border-slate-600 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60"
        }`}
      >
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-300 font-medium">Drop CSV here or click to browse</p>
        <p className="text-slate-500 text-sm mt-1">
          Columns: task_id, task_name, assignee, status, priority, due_date…
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="flex items-center gap-3 text-slate-500">
        <span className="h-px w-16 bg-slate-700" />
        <span className="text-sm">or</span>
        <span className="h-px w-16 bg-slate-700" />
      </div>

      <button
        onClick={loadSample}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
      >
        <FileText className="w-4 h-4" />
        Load Sample Dataset
      </button>

      <p className="text-slate-600 text-xs text-center max-w-sm">
        Sample includes 35 tasks across Engineering, Product, Operations,
        Security & HR — designed to surface real bottleneck and overdue patterns.
      </p>
    </div>
  );
}
