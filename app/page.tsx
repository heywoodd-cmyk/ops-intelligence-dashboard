"use client";

import { useState } from "react";
import { CSVUpload } from "@/components/CSVUpload";
import { Hero } from "@/components/Hero";
import { KpiTiles } from "@/components/KpiTiles";
import { AttentionList } from "@/components/AttentionList";
import { WorkloadChart } from "@/components/WorkloadChart";
import {
  TaskTable,
  EMPTY_FILTERS,
  type TaskTableFilters,
} from "@/components/TaskTable";
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

/** Smooth scroll to the task table with a small offset for visual breathing room. */
function scrollToTable() {
  const el = document.getElementById("task-table");
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const targetY = window.scrollY + rect.top - 24;
  window.scrollTo({ top: targetY, behavior: "smooth" });
}

export default function Home() {
  const [dataset, setDataset] = useState<NormalizedDataset | null>(null);
  const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);
  const [tableFilters, setTableFilters] =
    useState<TaskTableFilters>(EMPTY_FILTERS);
  const [tableOpen, setTableOpen] = useState(false);

  /** Pin a task from the attention list; clear any filters; open + scroll. */
  const handleTaskClick = (id: string) => {
    setPinnedTaskId(id);
    setTableFilters(EMPTY_FILTERS);
    setTableOpen(true);
    setTimeout(scrollToTable, 50);
  };

  /** Hero secondary button — filter the table to a department or assignee. */
  const handleViewTasks = (
    field: "department" | "assignee",
    value: string
  ) => {
    setPinnedTaskId(null);
    setTableFilters({
      ...EMPTY_FILTERS,
      [field]: value,
    });
    setTableOpen(true);
    setTimeout(scrollToTable, 80);
  };

  const handleNewUpload = () => {
    setDataset(null);
    setPinnedTaskId(null);
    setTableFilters(EMPTY_FILTERS);
    setTableOpen(false);
  };

  // ---- Empty / upload state -------------------------------------------
  if (!dataset) {
    return (
      <main className="min-h-screen">
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
    <main className="min-h-screen">
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
              onClick={handleNewUpload}
              className="text-xs text-muted hover:text-secondary px-3 py-1.5 rounded-md border border-card-border transition-colors"
            >
              New upload
            </button>
          </div>
        </header>

        <Hero dataset={dataset} onViewTasks={handleViewTasks} />

        <KpiTiles dataset={dataset} />

        <AttentionList dataset={dataset} onTaskClick={handleTaskClick} />

        <WorkloadChart dataset={dataset} />

        <TaskTable
          dataset={dataset}
          pinnedTaskId={pinnedTaskId}
          onClearPin={() => setPinnedTaskId(null)}
          open={tableOpen}
          onOpenChange={setTableOpen}
          filters={tableFilters}
          onFiltersChange={setTableFilters}
        />
      </div>
    </main>
  );
}
