"use client";

import { useState } from "react";
import { CSVUpload } from "@/components/CSVUpload";
import { MetricsGrid } from "@/components/MetricsGrid";
import { WorkloadChart } from "@/components/WorkloadChart";
import { StatusBreakdown } from "@/components/StatusBreakdown";
import { InsightsPanel } from "@/components/InsightsPanel";
import { TaskTable } from "@/components/TaskTable";
import { AnalystView } from "@/components/AnalystView";
import { SchemaMapper } from "@/components/SchemaMapper";
import { ValidationSummary } from "@/components/ValidationSummary";
import { Task, AnalysisResult } from "@/app/api/analyze/route";
import {
  ProposedMapping,
  ValidationReport,
  extractRawStatusValues,
  reshapeWithMapping,
} from "@/lib/schema";
import {
  Loader2,
  RotateCcw,
  Sparkles,
  LayoutDashboard,
  LineChart,
  ArrowRight,
} from "lucide-react";

type View = "analyst" | "operator";
type Stage = "upload" | "mapping" | "validation" | "dashboard";

export default function Home() {
  // --- Stage & flow state ------------------------------------------------
  const [stage, setStage] = useState<Stage>("upload");
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [proposedMapping, setProposedMapping] = useState<ProposedMapping | null>(
    null
  );
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [validationReport, setValidationReport] =
    useState<ValidationReport | null>(null);

  // --- Dashboard state ---------------------------------------------------
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("analyst");
  const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // Stage transitions
  // ----------------------------------------------------------------------

  /** Fallback path: CSV is canonical — go straight to the dashboard. */
  const handleCanonicalData = (newTasks: Task[]) => {
    setTasks(newTasks);
    setStage("dashboard");
    runAnalysis(newTasks);
  };

  /** Mapping path: kick off the AI schema-mapping call. */
  const handleRawData = async (
    data: Record<string, string>[],
    headers: string[]
  ) => {
    setRawData(data);
    setRawHeaders(headers);
    setProposedMapping(null);
    setMappingError(null);
    setStage("mapping");
    setMappingLoading(true);

    try {
      const res = await fetch("/api/map-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers,
          sampleRows: data.slice(0, 5),
        }),
      });
      if (!res.ok) throw new Error(`Mapping API ${res.status}`);
      const mapping = (await res.json()) as ProposedMapping;
      setProposedMapping(mapping);
    } catch (err) {
      setMappingError(
        err instanceof Error ? err.message : "AI mapping failed"
      );
    } finally {
      setMappingLoading(false);
    }
  };

  /** User confirmed (or manually set) the mapping — reshape + validate. */
  const handleConfirmMapping = (mapping: ProposedMapping) => {
    const { tasks: reshaped, report } = reshapeWithMapping(rawData, mapping);
    setTasks(reshaped);
    setValidationReport(report);

    if (report.issues.length === 0) {
      // Clean upload — skip the validation screen.
      setStage("dashboard");
      runAnalysis(reshaped);
    } else {
      setStage("validation");
    }
  };

  /** User accepted the validation report — enter dashboard. */
  const handleContinueFromValidation = () => {
    setStage("dashboard");
    runAnalysis(tasks);
  };

  /** User wants to revisit mappings (from validation screen). */
  const handleRemap = () => {
    setValidationReport(null);
    setStage("mapping");
  };

  /** Fire the AI insights analysis on the validated canonical tasks. */
  const runAnalysis = async (forTasks: Task[]) => {
    setAnalysis(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: forTasks }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data: AnalysisResult = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStage("upload");
    setRawData([]);
    setRawHeaders([]);
    setProposedMapping(null);
    setMappingError(null);
    setValidationReport(null);
    setTasks([]);
    setAnalysis(null);
    setError(null);
    setPinnedTaskId(null);
  };

  const handleTaskClick = (id: string) => {
    setPinnedTaskId(id);
    setTimeout(() => {
      document
        .getElementById("task-table")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // ----------------------------------------------------------------------
  // Render — one screen per stage
  // ----------------------------------------------------------------------

  // === Upload screen ===
  if (stage === "upload") {
    return (
      <main className="min-h-screen bg-page">
        <div className="max-w-3xl mx-auto py-16 px-4">
          <header className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-950/50 border border-violet-900/40 text-violet-300 text-xs font-medium mb-5">
              <Sparkles className="w-3 h-3" />
              AI-Powered Operations
            </div>
            <h1 className="text-3xl font-semibold text-[#d0d8ec] mb-2">
              Ops Intelligence Dashboard
            </h1>
            <p className="text-muted text-sm">
              Surface bottlenecks, overdue patterns & workload imbalances —
              instantly.
            </p>
          </header>
          <CSVUpload
            onCanonicalData={handleCanonicalData}
            onRawData={handleRawData}
          />
        </div>
      </main>
    );
  }

  // === Mapping screen ===
  if (stage === "mapping") {
    if (mappingLoading) {
      return (
        <main className="min-h-screen bg-page flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              Detecting your schema with Claude…
            </span>
          </div>
        </main>
      );
    }

    const statusCol = proposedMapping?.column_map?.status ?? null;
    const rawStatusValues = extractRawStatusValues(rawData, statusCol);

    return (
      <SchemaMapper
        rawHeaders={rawHeaders}
        rawStatusValues={rawStatusValues}
        proposedMapping={proposedMapping}
        mappingError={mappingError}
        onConfirm={handleConfirmMapping}
        onCancel={reset}
      />
    );
  }

  // === Validation screen ===
  if (stage === "validation" && validationReport) {
    return (
      <ValidationSummary
        report={validationReport}
        onContinue={handleContinueFromValidation}
        onRemap={handleRemap}
      />
    );
  }

  // === Dashboard ===
  return (
    <main className="min-h-screen bg-page">
      <div className="max-w-6xl mx-auto px-4 py-7">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-950/50 border border-violet-900/40 text-violet-300 text-[10px] font-medium mb-2">
              <Sparkles className="w-2.5 h-2.5" />
              AI-Powered Operations
            </div>
            <h1 className="text-xl font-semibold text-[#d0d8ec]">
              Ops Intelligence Dashboard
            </h1>
            <p className="text-muted text-xs mt-0.5">
              {tasks.length} tasks loaded
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-card border border-card-border rounded-xl p-1">
              <button
                onClick={() => setView("analyst")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === "analyst"
                    ? "bg-violet-600/80 text-white shadow-sm"
                    : "text-muted hover:text-[#a8b4cc]"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Analyst
              </button>
              <button
                onClick={() => setView("operator")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === "operator"
                    ? "bg-violet-600/80 text-white shadow-sm"
                    : "text-muted hover:text-[#a8b4cc]"
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                Operator
              </button>
            </div>

            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-card-border text-muted hover:text-[#a8b4cc] text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Upload
            </button>
          </div>
        </div>

        {/* "So what?" banner */}
        {analysis && !loading && analysis.topPriority && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#13161f] border border-[#1c2235]">
            <ArrowRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
            <p className="text-[#c8d2e8] text-sm font-medium">
              {analysis.topPriority}
            </p>
            <span className="ml-auto flex-shrink-0 text-[9px] text-muted uppercase tracking-widest font-medium">
              Top priority
            </span>
          </div>
        )}

        {view === "analyst" && (
          <AnalystView
            tasks={tasks}
            analysis={analysis}
            loading={loading}
            error={error}
            onTaskClick={handleTaskClick}
          />
        )}

        {view === "operator" && (
          <div className="space-y-6">
            <MetricsGrid tasks={tasks} />

            {(loading || analysis) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
                    AI Insights
                  </h2>
                </div>

                {loading && (
                  <div className="rounded-xl border border-card-border bg-card p-10 flex items-center justify-center gap-3 text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      Analyzing {tasks.length} tasks…
                    </span>
                  </div>
                )}

                {analysis && !loading && (
                  <InsightsPanel
                    analysis={analysis}
                    onTaskClick={handleTaskClick}
                  />
                )}
              </div>
            )}

            {error && !loading && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-card border border-card-border">
                <span className="w-1.5 h-1.5 rounded-full bg-muted mt-1.5 flex-shrink-0" />
                <p className="text-muted text-sm">
                  AI insights unavailable — charts and data below are still
                  accurate.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WorkloadChart tasks={tasks} />
              <StatusBreakdown tasks={tasks} />
            </div>

            <TaskTable
              tasks={tasks}
              pinnedTaskId={pinnedTaskId}
              onClearPin={() => setPinnedTaskId(null)}
            />
          </div>
        )}

        {view === "analyst" && tasks.length > 0 && (
          <div className="mt-6">
            <TaskTable
              tasks={tasks}
              pinnedTaskId={pinnedTaskId}
              onClearPin={() => setPinnedTaskId(null)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
