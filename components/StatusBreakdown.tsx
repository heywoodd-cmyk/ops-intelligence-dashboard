"use client";

import { Task } from "@/app/api/analyze/route";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface StatusBreakdownProps {
  tasks: Task[];
}

const COLORS: Record<string, string> = {
  Done: "#34d399",
  "In Progress": "#60a5fa",
  Blocked: "#f87171",
  Overdue: "#fbbf24",
  "Not Started": "#94a3b8",
};

export function StatusBreakdown({ tasks }: StatusBreakdownProps) {
  const today = new Date().toISOString().split("T")[0];

  const normalize = (t: Task): string => {
    if (
      t.due_date &&
      t.due_date < today &&
      t.status !== "Done" &&
      t.status !== "Completed"
    )
      return "Overdue";
    return t.status;
  };

  const counts: Record<string, number> = {};
  tasks.forEach((t) => {
    const s = normalize(t);
    counts[s] = (counts[s] || 0) + 1;
  });

  const data = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
        Status Distribution
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name] || "#64748b"}
              />
            ))}
          </Pie>
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
