"use client";

import { useState } from "react";
import { CSVUpload } from "@/components/CSVUpload";
import { Hero } from "@/components/Hero";
import { KpiTiles } from "@/components/KpiTiles";
import { AttentionList } from "@/components/AttentionList";
import { WorkloadChart } from "@/components/WorkloadChart";
import { TaskTable } from "@/components/TaskTable";
import { DataQualityBadge } from "@/components/DataQualityBadge";
import type { NormalizedDataset } from "@/lib/schema";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Home() {
  const [dataset, setDataset] = useState<NormalizedDataset | null>(null);
  const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);

  const handleTaskClick = (id: string) => {
    setPinnedTaskId(id);
    setTimeout(() => {
      document
        .getElementById("task-table")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const reset = () => {
    setDataset(null);
    setPinnedTaskId(null);
  };

  // ---- Empty / upload state -------------------------------------------
  if (!dataset) {
    return (
      <main className="min-h-screen bg-page">
        <div className="max-w-2xl mx-auto px-4 py-20">
          <header className="text-center mb-14">
            <h1 className="text-4xl font-medium tracking-tight text-primary mb-3">
              Operations Brief
            </h1>
            <p className="text-sm text-secondary">{formatDate(new Date())}</p>
          </header>
          <CSVUpload onDataset={setDataset} />
        </div>
      </main>
    );
  }

  // ---- Loaded dashboard -----------------------------------------------
  return (
    <main className="min-h-screen bg-page">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-medium tracking-tight text-primary mb-2">
              Operations Brief
            </h1>
            <p className="text-sm text-secondary">{formatDate(new Date())}</p>
          </div>
          <div className="flex items-center gap-2">
            <DataQualityBadge dataset={dataset} />
            <button
              onClick={reset}
              className="text-xs text-muted hover:text-secondary px-3 py-1.5 rounded-md border border-card-border transition-colors"
            >
              New upload
            </button>
          </div>
        </header>

        <Hero dataset={dataset} />

        <KpiTiles dataset={dataset} />

        <AttentionList dataset={dataset} onTaskClick={handleTaskClick} />

        <WorkloadChart dataset={dataset} />

        <TaskTable
          dataset={dataset}
          pinnedTaskId={pinnedTaskId}
          onClearPin={() => setPinnedTaskId(null)}
        />
      </div>
    </main>
  );
}
