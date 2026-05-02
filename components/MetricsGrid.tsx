"use client";

import { Task } from "@/app/api/analyze/route";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  BarChart2,
} from "lucide-react";

interface MetricsGridProps {
  tasks: Task[];
}

export function MetricsGrid({ tasks }: MetricsGridProps) {
  const today = new Date().toISOString().split("T")[0];

  const total = tasks.length;
  const done = tasks.filter(
    (t) => t.status === "Done" || t.status === "Completed"
  ).length;
  const blocked = tasks.filter((t) => t.status === "Blocked").length;
  const overdue = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date < today &&
      t.status !== "Done" &&
      t.status !== "Completed"
  ).length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const critical = tasks.filter(
    (t) =>
      t.priority === "Critical" &&
      t.status !== "Done" &&
      t.status !== "Completed"
  ).length;

  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const metrics = [
    {
      label: "Total Tasks",
      value: total,
      icon: BarChart2,
      color: "text-slate-400",
      bg: "bg-slate-800",
      border: "border-slate-700",
    },
    {
      label: "Completed",
      value: `${done} (${completionRate}%)`,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-900/20",
      border: "border-emerald-800/40",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-900/20",
      border: "border-blue-800/40",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: AlertTriangle,
      color: overdue > 0 ? "text-amber-400" : "text-slate-400",
      bg: overdue > 0 ? "bg-amber-900/20" : "bg-slate-800",
      border: overdue > 0 ? "border-amber-800/40" : "border-slate-700",
    },
    {
      label: "Blocked",
      value: blocked,
      icon: XCircle,
      color: blocked > 0 ? "text-red-400" : "text-slate-400",
      bg: blocked > 0 ? "bg-red-900/20" : "bg-slate-800",
      border: blocked > 0 ? "border-red-800/40" : "border-slate-700",
    },
    {
      label: "Critical Open",
      value: critical,
      icon: Zap,
      color: critical > 0 ? "text-orange-400" : "text-slate-400",
      bg: critical > 0 ? "bg-orange-900/20" : "bg-slate-800",
      border: critical > 0 ? "border-orange-800/40" : "border-slate-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className={`rounded-xl border ${m.bg} ${m.border} p-4 flex flex-col gap-2`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                {m.label}
              </span>
              <Icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <span className={`text-2xl font-bold ${m.color}`}>{m.value}</span>
          </div>
        );
      })}
    </div>
  );
}
