"use client";

export type DashboardView = "demo" | "architecture";

interface ViewTabsProps {
  value: DashboardView;
  onChange: (v: DashboardView) => void;
}

const TABS: Array<{ value: DashboardView; label: string }> = [
  { value: "demo", label: "Demo" },
  { value: "architecture", label: "Architecture" },
];

/**
 * Top-level segmented control. Same visual idiom as the WorkloadChart
 * group-by toggle so the dashboard reads as a single design system.
 * Rendered only when a dataset is loaded or the user is already on the
 * Architecture view — the empty upload screen stays clean.
 */
export function ViewTabs({ value, onChange }: ViewTabsProps) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center bg-zinc-900 border border-card-border rounded-md p-0.5"
    >
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${
              active
                ? "bg-zinc-800 text-primary"
                : "text-muted hover:text-secondary"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
