"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NormalizedDataset } from "@/lib/schema";

interface WorkloadChartProps {
  dataset: NormalizedDataset;
}

// Palette per Friday-demo spec — tonal zinc with rose for Blocked.
// Stack ordered bottom→top so Blocked sits at the eye-catching top.
const STATUS_COLORS: Record<string, string> = {
  Done: "#3f3f46",         // zinc-700
  "Not Started": "#52525b", // zinc-600
  "In Progress": "#d4d4d8", // zinc-300
  Blocked: "#f43f5e",      // rose-500
};

const STACK_ORDER = ["Done", "Not Started", "In Progress", "Blocked"];

/**
 * Per-assignee stacked task counts. Hides itself entirely when the
 * dataset lacks an assignee column.
 */
export function WorkloadChart({ dataset }: WorkloadChartProps) {
  if (!dataset.hasAssignee) return null;

  // Group tasks by assignee. Tasks with null assignee (shouldn't happen
  // when hasAssignee=true, but defensive) are excluded.
  const assignees = Array.from(
    new Set(
      dataset.tasks
        .map((t) => t.assignee)
        .filter((a): a is string => !!a)
    )
  ).sort();

  if (assignees.length === 0) return null;

  const data = assignees.map((name) => {
    const theirTasks = dataset.tasks.filter((t) => t.assignee === name);
    const row: Record<string, string | number> = {
      name: name.split(/\s+/)[0],
    };
    for (const status of STACK_ORDER) {
      row[status] = theirTasks.filter((t) => t.status === status).length;
    }
    return row;
  });

  return (
    <section>
      <p className="text-xs text-muted uppercase tracking-widest mb-4">
        Workload by assignee
      </p>
      <div className="bg-card border border-card-border rounded-md p-6">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "#1f1f23" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#131316",
                border: "1px solid #1f1f23",
                borderRadius: "6px",
                color: "#fafafa",
                fontSize: 12,
              }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Legend
              wrapperStyle={{ color: "#71717a", fontSize: 11 }}
              iconType="circle"
              iconSize={7}
            />
            {STACK_ORDER.map((status) => (
              <Bar
                key={status}
                dataKey={status}
                stackId="a"
                fill={STATUS_COLORS[status]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
