"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
import {
  DraftActionModal,
  type ActionType,
  type DraftActionContext,
  type TaskContextItem,
} from "@/components/DraftActionModal";
import {
  KpiDrillModal,
  type KpiDrillKind,
} from "@/components/KpiDrillModal";
import type {
  CanonicalStatus,
  NormalizedDataset,
  Task,
} from "@/lib/schema";
import { modifiedTaskIdSet, setTaskStatus } from "@/lib/edit";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * One-line orientation message for non-technical viewers. Adapts to
 * whether the dataset carries a department column.
 */
function buildTagline(dataset: NormalizedDataset): string {
  const total = dataset.rowCount;
  const taskWord = total === 1 ? "task" : "tasks";
  if (dataset.hasDepartment) {
    const depts = new Set(
      dataset.tasks.map((t) => t.department).filter((d): d is string => !!d)
    ).size;
    const deptWord = depts === 1 ? "department" : "departments";
    return `Tracking ${total} ${taskWord} across ${depts} ${deptWord}. Click any row, button, or filter to explore.`;
  }
  return `Tracking ${total} ${taskWord}. Click any row, button, or filter to explore.`;
}

/** Smooth scroll to the task table with a small offset for visual breathing room. */
function scrollToTable() {
  const el = document.getElementById("task-table");
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const targetY = window.scrollY + rect.top - 24;
  window.scrollTo({ top: targetY, behavior: "smooth" });
}

const MS_PER_DAY = 86_400_000;

function toContextItem(t: Task, today: Date): TaskContextItem {
  const daysOverdue =
    t.overdue && t.due_date
      ? Math.max(
          0,
          Math.floor((today.getTime() - t.due_date.getTime()) / MS_PER_DAY)
        )
      : 0;
  return {
    task_id: t.task_id,
    task_name: t.task_name,
    status: t.status,
    priority: t.priority,
    days_overdue: daysOverdue,
    assignee: t.assignee,
    department: t.department,
  };
}

function buildModalContext(
  dataset: NormalizedDataset,
  filter: { department?: string; assignee?: string }
): DraftActionContext {
  const today = new Date(dataset.today + "T00:00:00");
  const matches = (t: Task) => {
    if (filter.department && t.department !== filter.department) return false;
    if (filter.assignee && t.assignee !== filter.assignee) return false;
    return t.overdue || t.status === "Blocked";
  };
  const tasks = dataset.tasks
    .filter(matches)
    .map((t) => toContextItem(t, today));
  return {
    department: filter.department,
    assignee: filter.assignee,
    tasks,
  };
}

interface ModalState {
  actionType: ActionType;
  context: DraftActionContext;
}

export default function Home() {
  const [dataset, setDataset] = useState<NormalizedDataset | null>(null);
  const [originalDataset, setOriginalDataset] =
    useState<NormalizedDataset | null>(null);
  const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);
  const [tableFilters, setTableFilters] =
    useState<TaskTableFilters>(EMPTY_FILTERS);
  const [tableOpen, setTableOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [kpiDrill, setKpiDrill] = useState<KpiDrillKind | null>(null);

  /** Track which task IDs differ from the original dataset by status. */
  const modifiedTaskIds = useMemo(() => {
    if (!dataset || !originalDataset) return new Set<string>();
    return modifiedTaskIdSet(dataset, originalDataset);
  }, [dataset, originalDataset]);

  const canReset = modifiedTaskIds.size > 0;

  /** First-time dataset load — snapshot it as the "original" too. */
  const handleSetDataset = (d: NormalizedDataset) => {
    setDataset(d);
    setOriginalDataset(d);
  };

  /** Inline status edit from the task table. */
  const handleStatusChange = (taskId: string, newStatus: CanonicalStatus) => {
    setDataset((prev) =>
      prev ? setTaskStatus(prev, taskId, newStatus) : null
    );
  };

  /** Reset to original — discards all status edits. */
  const handleReset = () => {
    if (!originalDataset) return;
    setDataset(originalDataset);
  };

  const handleTaskClick = (id: string) => {
    setPinnedTaskId(id);
    setTableFilters(EMPTY_FILTERS);
    setTableOpen(true);
    setTimeout(scrollToTable, 50);
  };

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

  const handleOpenModal = (params: {
    actionType: ActionType;
    department?: string;
    assignee?: string;
  }) => {
    if (!dataset) return;
    const context = buildModalContext(dataset, {
      department: params.department,
      assignee: params.assignee,
    });
    setModal({ actionType: params.actionType, context });
  };

  const handleNewUpload = () => {
    setDataset(null);
    setOriginalDataset(null);
    setPinnedTaskId(null);
    setTableFilters(EMPTY_FILTERS);
    setTableOpen(false);
    setModal(null);
    setKpiDrill(null);
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
          <CSVUpload onDataset={handleSetDataset} />
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
            <p className="text-sm text-muted mt-1">{buildTagline(dataset)}</p>
          </div>
          <div className="flex items-center gap-2">
            <DataQualityBadge dataset={dataset} />
            <button
              onClick={handleNewUpload}
              className="text-xs px-3 py-1.5 rounded-md border border-card-border transition-colors cursor-pointer flex items-center gap-1.5
                         text-zinc-200 hover:text-zinc-50 hover:bg-[#1f1f23]"
            >
              <ArrowLeft className="w-4 h-4" />
              Upload new file
            </button>
          </div>
        </header>

        <Hero
          dataset={dataset}
          onViewTasks={handleViewTasks}
          onOpenModal={handleOpenModal}
        />

        <KpiTiles dataset={dataset} onDrillThrough={setKpiDrill} />

        <AttentionList
          dataset={dataset}
          onTaskClick={handleTaskClick}
          onOpenModal={handleOpenModal}
        />

        <WorkloadChart dataset={dataset} />

        <TaskTable
          dataset={dataset}
          pinnedTaskId={pinnedTaskId}
          onClearPin={() => setPinnedTaskId(null)}
          open={tableOpen}
          onOpenChange={setTableOpen}
          filters={tableFilters}
          onFiltersChange={setTableFilters}
          onStatusChange={handleStatusChange}
          modifiedTaskIds={modifiedTaskIds}
          canReset={canReset}
          onReset={handleReset}
        />
      </div>

      <DraftActionModal
        open={modal !== null}
        actionType={modal?.actionType ?? "standup_agenda"}
        context={modal?.context ?? { tasks: [] }}
        onClose={() => setModal(null)}
      />

      {/* KPI receipts modal — click any KPI tile to see the rows behind
          the number. Editing status from inside live-updates everything. */}
      <KpiDrillModal
        open={kpiDrill !== null}
        kind={kpiDrill}
        dataset={dataset}
        onStatusChange={handleStatusChange}
        onClose={() => setKpiDrill(null)}
      />
    </main>
  );
}
