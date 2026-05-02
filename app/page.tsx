"use client";

import { useState } from "react";
import { CSVUpload } from "@/components/CSVUpload";
import { MetricsGrid } from "@/components/MetricsGrid";
import { WorkloadChart } from "@/components/WorkloadChart";
import { StatusBreakdown } from "@/components/StatusBreakdown";
import { InsightsPanel } from "@/components/InsightsPanel";
import { TaskTable } from "@/components/TaskTable";
import { Task, AnalysisResult } from "@/app/api/analyze/route";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <main className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto py-16 px-4">
          <header className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/40 border border-indigo-700/40 text-indigo-400 text-xs font-medium mb-4">
              <Sparkles className="w-3 h-3" />
              AI-Powered Operations
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Ops Intelligence Dashboard
            </h1>
            <p className="text-slate-400">
              Surface bottlenecks, overdue patterns & workload imbalances — instantly.
            </p>
          </header>
          <CSVUpload onData={handleData} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/40 border border-indigo-700/40 text-indigo-400 text-xs font-medium mb-2">
              <Sparkles className="w-3 h-3" />
              AI-Powered Operations
            </div>
            <h1 className="text-2xl font-bold text-white">
              Ops Intelligence Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {tasks.length} tasks loaded
            </p>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Upload
          </button>
        </div>

        {/* Metrics */}
        <section className="mb-6">
          <MetricsGrid tasks={tasks} />
        </section>

        {/* AI Insights */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              AI Insights
            </h2>
          </div>

          {loading && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-10 flex items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Analyzing {tasks.length} tasks…</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-5 text-red-300 text-sm">
              <strong>Analysis failed:</strong> {error}
            </div>
          )}

          {analysis && !loading && <InsightsPanel analysis={analysis} />}
        </section>

        {/* Charts */}
        <section className="mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WorkloadChart tasks={tasks} />
            <StatusBreakdown tasks={tasks} />
          </div>
        </section>

        {/* Task Table */}
        <section>
          <TaskTable tasks={tasks} />
        </section>
      </div>
    </main>
  );
}
