"use client";

import { useState } from "react";
import { CSVUpload } from "@/components/CSVUpload";
import { MetricsGrid } from "@/components/MetricsGrid";
import { WorkloadChart } from "@/components/WorkloadChart";
import { StatusBreakdown } from "@/components/StatusBreakdown";
import { InsightsPanel } from "@/components/InsightsPanel";
import { TaskTable } from "@/components/TaskTable";
import { AnalystView } from "@/components/AnalystView";
import { Task, AnalysisResult } from "@/app/api/analyze/route";
import { Loader2, RotateCcw, Sparkles, LayoutDashboard, LineChart } from "lucide-react";

type View = "analyst" | "operator";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("analyst");

  const handleData = async (newTasks: Task[]) => {
    setTasks(newTasks);
    setAnalysis(null);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: newTasks }),
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
    setTasks([]);
    setAnalysis(null);
    setError(null);
  };

  if (tasks.length === 0) {
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
              Surface bottlenecks, overdue patterns & workload imbalances — instantly.
            </p>
          </header>
          <CSVUpload onData={handleData} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <div className="max-w-6xl mx-auto px-4 py-7">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-950/50 border border-violet-900/40 text-violet-300 text-[10px] font-medium mb-2">
              <Sparkles className="w-2.5 h-2.5" />
              AI-Powered Operations
            </div>
            <h1 className="text-xl font-semibold text-[#d0d8ec]">
              Ops Intelligence Dashboard
            </h1>
            <p className="text-muted text-xs mt-0.5">{tasks.length} tasks loaded</p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
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

        {/* Analyst View */}
        {view === "analyst" && (
          <AnalystView
            tasks={tasks}
            analysis={analysis}
            loading={loading}
            error={error}
          />
        )}

        {/* Operator View */}
        {view === "operator" && (
          <div className="space-y-5">
            <MetricsGrid tasks={tasks} />

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
                  <span className="text-sm">Analyzing {tasks.length} tasks…</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-red-300 text-sm">
                  <strong>Analysis failed:</strong> {error}
                </div>
              )}

              {analysis && !loading && <InsightsPanel analysis={analysis} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WorkloadChart tasks={tasks} />
              <StatusBreakdown tasks={tasks} />
            </div>

            <TaskTable tasks={tasks} />
          </div>
        )}

      </div>
    </main>
  );
}
