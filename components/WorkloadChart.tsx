"use client";

import { Task } from "@/app/api/analyze/route";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WorkloadChartProps {
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  Done: "#34d399",
  "In Progress": "#60a5fa",
  Blocked: "#f87171",
  Overdue: "#fbbf24",
  "Not Started": "#94a3b8",
};

const STATUSES = ["Done", "In Progress", "Blocked", "Overdue", "Not Started"];

export function WorkloadChart({ tasks }: WorkloadChartProps) {
  const today = new Date().toISOString().split("T")[0];

  const assignees = [...new Set(tasks.map((t) => t.assignee))].sort();

  const data = assignees.map((name) => {
    const assigneeTasks = tasks.filter((t) => t.assignee === name);
    const row: Record<string, string | number> = { name: name.split(" ")[0] };

    STATUSES.forEach((s) => {
      if (s === "Overdue") {
        row[s] = assigneeTasks.filter(
          (t) =>
            t.due_date &&
            t.due_date < today &&
            t.status !== "Done" &&
            t.status !== "Completed"
        ).length;
      } else {
        row[s] = assigneeTasks.filter((t) => t.status === s).length;
      }
    });

    return row;
  });

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
        Workload by Assignee
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "#475569" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
            }}
          />
          <Legend
            wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
            iconType="circle"
          />
          {STATUSES.map((s) => (
            <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
