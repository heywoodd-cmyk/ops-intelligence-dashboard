"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
  points: number[];
  color: string;
}

/**
 * Minimal 7-point sparkline. No axes, no grid, no tooltip, no dots.
 * Returns null when no points — the caller is responsible for keeping
 * sparkline visibility in sync with the matching KPI subline (both
 * appear together when weekly snapshot data exists, both disappear
 * together when it doesn't).
 */
export function Sparkline({ points, color }: SparklineProps) {
  if (points.length === 0) return null;
  const data = points.map((value, index) => ({ index, value }));

  return (
    <div style={{ height: 24, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
        >
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
