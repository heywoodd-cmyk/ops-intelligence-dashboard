"use client";

import { Task } from "@/app/api/analyze/route";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface StatusBreakdownProps {
  tasks: Task[];
}

const COLORS: Record<string, string> = {
  Done: "#6ee7b7",
  "In Progress": "#93c5fd",
  Blocked: "#fca5a5",
  Overdue: "#fcd34d",
  "Not Started": "#374151",
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
    <div className="rounded-xl border border-card-border bg-card p-5">
      <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-5">
        Status Distribution
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="44%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || "#374151"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#111520",
              border: "1px solid #1c2235",
              borderRadius: "10px",
              color: "#d0d8ec",
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ color: "#6b778f", fontSize: 11 }}
            iconType="circle"
            iconSize={7}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
