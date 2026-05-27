"use client";

import { heroCopy } from "@/lib/hero";
import type { NormalizedDataset } from "@/lib/schema";

interface HeroProps {
  dataset: NormalizedDataset;
  /**
   * Called when the secondary "View {…} tasks" button is clicked.
   * Page-level handler scrolls to the table, opens it, and applies the
   * filter. Unwired for status-driven and all-clear branches.
   */
  onViewTasks?: (
    field: "department" | "assignee",
    value: string
  ) => void;
}

export function Hero({ dataset, onViewTasks }: HeroProps) {
  const copy = heroCopy(dataset);
  const { headline, subline, buttons, context } = copy;

  const handleSecondary = (action: string) => {
    if (action === "view-department" && context?.department) {
      onViewTasks?.("department", context.department);
    } else if (action === "view-assignee" && context?.assignee) {
      onViewTasks?.("assignee", context.assignee);
    }
    // Other secondary actions (view-overdue, etc.) intentionally unwired
    // for Phase 1.5 — that's Phase 3 / future work.
  };

  return (
    <section className="relative py-12">
      {/* Subtle violet glow behind the headline. Pointer-events disabled
          so the entire section stays clickable through it. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 400px 200px at 0% 30%, rgba(139, 92, 246, 0.08), transparent)",
        }}
      />
      <div className="relative">
        <h2 className="text-4xl font-semibold tracking-tight text-primary mb-4 max-w-3xl">
          {headline}
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-2xl leading-relaxed">
          {subline}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {buttons.map((b, i) => {
            const isPrimary = i === 0;
            return (
              <button
                key={b.action}
                onClick={
                  isPrimary
                    ? () => {
                        /* Primary wired in Phase 3 (DraftActionModal) */
                      }
                    : () => handleSecondary(b.action)
                }
                className={
                  isPrimary
                    ? "text-sm font-medium px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                    : "text-sm text-secondary px-4 py-2 rounded-md hover:bg-card-border transition-colors"
                }
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
