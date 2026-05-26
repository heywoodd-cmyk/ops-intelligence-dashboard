"use client";

import { AnalysisResult } from "@/app/api/analyze/route";
import { AlertTriangle, Clock, Users, Zap, Sparkles } from "lucide-react";
import { useState } from "react";

interface InsightsPanelProps {
  analysis: AnalysisResult;
  onTaskClick?: (id: string) => void;
}

const RISK_CONFIG = {
  low: {
    label: "Low Risk",
    color: "text-emerald-300",
    bg: "bg-emerald-950/25",
    border: "border-emerald-900/40",
    dot: "bg-emerald-400",
  },
  medium: {
    label: "Medium Risk",
    color: "text-amber-300",
    bg: "bg-amber-950/25",
    border: "border-amber-900/40",
    dot: "bg-amber-400",
  },
  high: {
    label: "High Risk",
    color: "text-orange-300",
    bg: "bg-orange-950/25",
    border: "border-orange-900/40",
    dot: "bg-orange-400",
  },
  critical: {
    label: "Critical Risk",
    color: "text-red-300",
    bg: "bg-red-950/25",
    border: "border-red-900/40",
    dot: "bg-red-400",
  },
};

/** Splits text on T-XXX IDs and renders them as clickable chips */
function renderWithChips(
  text: string,
  onTaskClick?: (id: string) => void
): React.ReactNode {
  const parts = text.split(/\b(T-\d+)\b/g);
  return parts.map((part, i) => {
    if (/^T-\d+$/.test(part)) {
      return (
        <button
          key={i}
          onClick={() => onTaskClick?.(part)}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-violet-950/60 border border-violet-800/50 text-violet-300 text-[11px] font-mono hover:bg-violet-900/60 hover:border-violet-700/60 transition-colors cursor-pointer"
          title={`Jump to ${part} in task table`}
        >
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function InsightsPanel({ analysis, onTaskClick }: InsightsPanelProps) {
  const risk = RISK_CONFIG[analysis.riskLevel] || RISK_CONFIG.medium;

  return (
    <div className="space-y-4">
      {/* Risk badge + summary */}
      <div className={`rounded-xl border ${risk.border} ${risk.bg} p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full ${risk.dot} animate-pulse`} />
          <span
            className={`text-[10px] font-semibold uppercase tracking-widest ${risk.color}`}
          >
            {risk.label}
          </span>
        </div>
        <p className="text-[#c8d2e8] text-sm leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightSection
          icon={<AlertTriangle className="w-3.5 h-3.5 text-red-300" />}
          title="Bottlenecks"
          items={analysis.bottlenecks}
          dotColor="bg-red-400/70"
          onTaskClick={onTaskClick}
        />
        <InsightSection
          icon={<Clock className="w-3.5 h-3.5 text-amber-300" />}
          title="Overdue Patterns"
          items={analysis.overduePatterns}
          dotColor="bg-amber-400/70"
          onTaskClick={onTaskClick}
        />
        <InsightSection
          icon={<Users className="w-3.5 h-3.5 text-blue-300" />}
          title="Workload"
          items={analysis.workloadIssues}
          dotColor="bg-blue-400/70"
          onTaskClick={onTaskClick}
        />
        <InsightSection
          icon={<Zap className="w-3.5 h-3.5 text-violet-300" />}
          title="Recommendations"
          items={analysis.topRecommendations}
          dotColor="bg-violet-400"
          numbered
          isAI
          onTaskClick={onTaskClick}
        />
      </div>
    </div>
  );
}

function InsightSection({
  icon,
  title,
  items,
  dotColor,
  numbered = false,
  isAI = false,
  onTaskClick,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  dotColor: string;
  numbered?: boolean;
  isAI?: boolean;
  onTaskClick?: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 3;
  const displayed = showAll ? items : items.slice(0, LIMIT);
  const hiddenCount = items.length - LIMIT;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
            {title}
          </h4>
        </div>
        {isAI && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-950/50 border border-violet-900/40 text-[9px] text-violet-400 font-medium uppercase tracking-wider">
            <Sparkles className="w-2 h-2" />
            AI suggestion
          </span>
        )}
      </div>

      <ul className="space-y-2.5">
        {displayed.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            {numbered ? (
              <span
                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full ${dotColor} flex items-center justify-center text-[10px] font-bold text-[#0c0f1a]`}
              >
                {i + 1}
              </span>
            ) : (
              <span
                className={`mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotColor}`}
              />
            )}
            <span className="text-[#a8b4cc] text-sm leading-relaxed">
              {renderWithChips(item, onTaskClick)}
            </span>
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-[11px] text-muted hover:text-[#a8b4cc] transition-colors"
        >
          {showAll ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
