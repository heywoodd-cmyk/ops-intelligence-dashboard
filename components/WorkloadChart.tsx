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
  Done: "#6ee7b7",
  "In Progress": "#93c5fd",
  Blocked: "#fca5a5",
  Overdue: "#fcd34d",
  "Not Started": "#374151",
};

const STATUSES = ["Done", "In Progress", "Blocked", "Overdue", "Not Started"];

export function WorkloadChart({ tasks }: WorkloadChartProps) {
  const today = new Date().toISOString().split("T")[0];
  const assignees = [...new Set(tasks.map((t) => t.assignee))].sort();

  const data = assignees.map((name) => {
    const at = tasks.filter((t) => t.assignee === name);
    const row: Record<string, string | number> = { name: name.split(" ")[0] };
    STATUSES.forEach((s) => {
      if (s === "Overdue") {
        row[s] = at.filter(
          (t) =>
            t.due_date &&
            t.due_date < today &&
            t.status !== "Done" &&
            t.status !== "Completed"
        ).length;
      } else {
        row[s] = at.filter((t) => t.status === s).length;
      }
    });
    return row;
  });

  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-5">
        Workload by Assignee
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c2235" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#6b778f", fontSize: 11 }}
            axisLine={{ stroke: "#1c2235" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b778f", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111520",
              border: "1px solid #1c2235",
              borderRadius: "10px",
              color: "#d0d8ec",
              fontSize: 12,
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Legend
            wrapperStyle={{ color: "#6b778f", fontSize: 11 }}
            iconType="circle"
            iconSize={7}
          />
          {STATUSES.map((s) => (
            <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]} radius={s === "Done" ? [3, 3, 0, 0] : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
