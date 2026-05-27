"use client";

import { useState } from "react";
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
import type { NormalizedDataset, Task } from "@/lib/schema";

interface WorkloadChartProps {
  dataset: NormalizedDataset;
}

type GroupBy = "Department" | "Assignee";

// Palette per Friday-demo spec — tonal zinc with rose for Blocked.
const STATUS_COLORS: Record<string, string> = {
  Done: "#3f3f46",          // zinc-700
  "Not Started": "#52525b", // zinc-600
  "In Progress": "#d4d4d8", // zinc-300
  Blocked: "#f43f5e",       // rose-500
};

const STACK_ORDER = ["Done", "Not Started", "In Progress", "Blocked"];

/**
 * Stacked task counts grouped by department (default) or assignee.
 * Toggle is hidden when the dataset has no department column.
 * The whole chart hides when neither grouping is available.
 */
export function WorkloadChart({ dataset }: WorkloadChartProps) {
  // Default to Department when available, else Assignee.
  const initial: GroupBy = dataset.hasDepartment ? "Department" : "Assignee";
  const [groupBy, setGroupBy] = useState<GroupBy>(initial);

  // Hide the chart entirely when neither grouping has a source column.
  if (!dataset.hasDepartment && !dataset.hasAssignee) return null;

  // If the user is on Assignee but the dataset only has dept, force back
  // to Department. (Won't happen on a single dataset, but harmless.)
  const effectiveGroup: GroupBy =
    groupBy === "Assignee" && !dataset.hasAssignee
      ? "Department"
      : groupBy === "Department" && !dataset.hasDepartment
        ? "Assignee"
        : groupBy;

  const getGroupKey = (t: Task): string | null =>
    effectiveGroup === "Department" ? t.department : t.assignee;

  const groups = Array.from(
    new Set(
      dataset.tasks
        .map(getGroupKey)
        .filter((g): g is string => !!g)
    )
  ).sort();

  if (groups.length === 0) return null;

  // Tight layout up to 6 bars; rotate labels at 7+ to avoid clipping.
  const labelsRotated = groups.length > 6;

  const data = groups.map((name) => {
    const theirTasks = dataset.tasks.filter(
      (t) => getGroupKey(t) === name
    );
    // For Assignee mode, abbreviate to first name (chart space).
    // For Department mode, keep the full name.
    const label =
      effectiveGroup === "Assignee" ? name.split(/\s+/)[0] : name;
    const row: Record<string, string | number> = { name: label };
    for (const status of STACK_ORDER) {
      row[status] = theirTasks.filter((t) => t.status === status).length;
    }
    return row;
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted uppercase tracking-widest">
          Workload by {effectiveGroup.toLowerCase()}
        </p>
        {dataset.hasDepartment && dataset.hasAssignee && (
          <GroupByToggle value={effectiveGroup} onChange={setGroupBy} />
        )}
      </div>
      <div className="card-surface rounded-md p-6">
        <ResponsiveContainer
          width="100%"
          height={labelsRotated ? 280 : 240}
        >
          <BarChart
            data={data}
            margin={{
              top: 8,
              right: 8,
              left: -20,
              bottom: labelsRotated ? 30 : 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "#1f1f23" }}
              tickLine={false}
              interval={0}
              angle={labelsRotated ? -45 : 0}
              textAnchor={labelsRotated ? "end" : "middle"}
              height={labelsRotated ? 60 : 30}
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

function GroupByToggle({
  value,
  onChange,
}: {
  value: GroupBy;
  onChange: (g: GroupBy) => void;
}) {
  const options: GroupBy[] = ["Department", "Assignee"];
  return (
    <div className="inline-flex items-center bg-zinc-900 border border-card-border rounded-md p-0.5">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`text-[11px] px-2.5 py-1 rounded transition-colors ${
              active
                ? "bg-zinc-800 text-primary"
                : "text-muted hover:text-secondary"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
