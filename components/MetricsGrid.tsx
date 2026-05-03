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
      color: "text-[#8b96b0]",
      bg: "bg-card border-card-border",
    },
    {
      label: "Completed",
      value: `${done} (${completionRate}%)`,
      icon: CheckCircle2,
      color: "text-emerald-300",
      bg: "bg-emerald-950/25 border-emerald-900/40",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: Clock,
      color: "text-blue-300",
      bg: "bg-blue-950/25 border-blue-900/40",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: AlertTriangle,
      color: overdue > 0 ? "text-amber-300" : "text-[#8b96b0]",
      bg: overdue > 0 ? "bg-amber-950/25 border-amber-900/40" : "bg-card border-card-border",
    },
    {
      label: "Blocked",
      value: blocked,
      icon: XCircle,
      color: blocked > 0 ? "text-red-300" : "text-[#8b96b0]",
      bg: blocked > 0 ? "bg-red-950/25 border-red-900/40" : "bg-card border-card-border",
    },
    {
      label: "Critical Open",
      value: critical,
      icon: Zap,
      color: critical > 0 ? "text-orange-300" : "text-[#8b96b0]",
      bg: critical > 0 ? "bg-orange-950/25 border-orange-900/40" : "bg-card border-card-border",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className={`rounded-xl border ${m.bg} p-4 flex flex-col gap-2`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted font-medium uppercase tracking-widest">
                {m.label}
              </span>
              <Icon className={`w-3.5 h-3.5 ${m.color}`} />
            </div>
            <span className={`text-2xl font-semibold ${m.color}`}>{m.value}</span>
          </div>
        );
      })}
    </div>
  );
}
