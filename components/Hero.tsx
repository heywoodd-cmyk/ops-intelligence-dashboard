"use client";

import { heroCopy } from "@/lib/hero";
import type { NormalizedDataset } from "@/lib/schema";
import type { ActionType } from "@/components/DraftActionModal";

interface HeroProps {
  dataset: NormalizedDataset;
  /** Secondary "View {…} tasks" — filter the task table and scroll. */
  onViewTasks?: (
    field: "department" | "assignee",
    value: string
  ) => void;
  /** Primary "Brief / Draft / Generate" — open the draft-action modal. */
  onOpenModal?: (params: {
    actionType: ActionType;
    department?: string;
    assignee?: string;
  }) => void;
}

/**
 * Map the hero's `action` identifier to the modal's action_type plus a
 * flag for whether the dataset has anything to draft from.
 *
 *   brief-department   → department_brief
 *   draft-message      → individual_message
 *   draft-update       → standup_agenda (status-driven branch)
 *   generate-summary   → null (all-clear; nothing to summarize, disabled)
 */
function primaryActionType(action: string): ActionType | null {
  switch (action) {
    case "brief-department":
      return "department_brief";
    case "draft-message":
      return "individual_message";
    case "draft-update":
      return "standup_agenda";
    default:
      return null;
  }
}

export function Hero({ dataset, onViewTasks, onOpenModal }: HeroProps) {
  const copy = heroCopy(dataset);
  const { headline, subline, buttons, context } = copy;

  const primaryAction = buttons[0]?.action;
  const actionType = primaryAction
    ? primaryActionType(primaryAction)
    : null;
  const primaryDisabled = actionType === null;

  const handlePrimary = () => {
    if (!actionType) return;
    onOpenModal?.({
      actionType,
      department: context?.department,
      assignee: context?.assignee,
    });
  };

  const handleSecondary = (action: string) => {
    if (action === "view-department" && context?.department) {
      onViewTasks?.("department", context.department);
    } else if (action === "view-assignee" && context?.assignee) {
      onViewTasks?.("assignee", context.assignee);
    }
    // Other secondary actions (view-overdue, etc.) intentionally unwired.
  };

  return (
    <section className="relative py-12">
      {/* Subtle violet glow behind the headline. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 400px 200px at 0% 30%, rgba(139, 92, 246, 0.05), transparent)",
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
            const disabled = isPrimary && primaryDisabled;
            return (
              <button
                key={b.action}
                onClick={
                  isPrimary
                    ? handlePrimary
                    : () => handleSecondary(b.action)
                }
                disabled={disabled}
                className={
                  isPrimary
                    ? "text-sm font-medium px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
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
