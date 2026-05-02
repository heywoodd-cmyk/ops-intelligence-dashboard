"use client";

import { AnalysisResult } from "@/app/api/analyze/route";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Clock,
  Zap,
} from "lucide-react";

interface InsightsPanelProps {
  analysis: AnalysisResult;
}

const RISK_CONFIG = {
  low: {
    label: "Low Risk",
    color: "text-emerald-400",
    bg: "bg-emerald-900/20",
    border: "border-emerald-700/40",
    dot: "bg-emerald-400",
  },
  medium: {
    label: "Medium Risk",
    color: "text-amber-400",
    bg: "bg-amber-900/20",
    border: "border-amber-700/40",
    dot: "bg-amber-400",
  },
  high: {
    label: "High Risk",
    color: "text-orange-400",
    bg: "bg-orange-900/20",
    border: "border-orange-700/40",
    dot: "bg-orange-400",
  },
  critical: {
    label: "Critical Risk",
    color: "text-red-400",
    bg: "bg-red-900/20",
    border: "border-red-700/40",
    dot: "bg-red-400",
  },
};

export function InsightsPanel({ analysis }: InsightsPanelProps) {
  const risk = RISK_CONFIG[analysis.riskLevel] || RISK_CONFIG.medium;

  return (
    <div className="space-y-4">
      {/* Risk badge + summary */}
      <div className={`rounded-xl border ${risk.border} ${risk.bg} p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full ${risk.dot} animate-pulse`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${risk.color}`}>
            {risk.label}
          </span>
        </div>
        <p className="text-slate-200 text-sm leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bottlenecks */}
        <InsightSection
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          title="Bottlenecks"
          items={analysis.bottlenecks}
          itemColor="text-red-300"
          dotColor="bg-red-500"
        />

        {/* Overdue Patterns */}
        <InsightSection
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          title="Overdue Patterns"
          items={analysis.overduePatterns}
          itemColor="text-amber-300"
          dotColor="bg-amber-500"
        />

        {/* Workload Issues */}
        <InsightSection
          icon={<Users className="w-4 h-4 text-blue-400" />}
          title="Workload Issues"
          items={analysis.workloadIssues}
          itemColor="text-blue-300"
          dotColor="bg-blue-500"
        />

        {/* Top Recommendations */}
        <InsightSection
          icon={<Zap className="w-4 h-4 text-emerald-400" />}
          title="Top Recommendations"
          items={analysis.topRecommendations}
          itemColor="text-emerald-300"
          dotColor="bg-emerald-500"
          numbered
        />
      </div>
    </div>
  );
}

function InsightSection({
  icon,
  title,
  items,
  itemColor,
  dotColor,
  numbered = false,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  itemColor: string;
  dotColor: string;
  numbered?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          {title}
        </h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            {numbered ? (
              <span
                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full ${dotColor} flex items-center justify-center text-[10px] font-bold text-slate-900`}
              >
                {i + 1}
              </span>
            ) : (
              <span
                className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotColor}`}
              />
            )}
            <span className={`text-sm ${itemColor} leading-relaxed`}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
