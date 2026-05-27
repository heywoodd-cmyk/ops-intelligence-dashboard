"use client";

import { heroCopy } from "@/lib/hero";
import type { NormalizedDataset } from "@/lib/schema";

interface HeroProps {
  dataset: NormalizedDataset;
}

/**
 * Data-driven hero block. heroCopy() picks one of three branches based
 * on assignee data + overdue count. Buttons render but are not wired —
 * that's Day 2 work per spec. Click handlers are intentional no-ops.
 */
export function Hero({ dataset }: HeroProps) {
  const { headline, subline, buttons } = heroCopy(dataset);

  return (
    <section className="py-12">
      <h2 className="text-4xl font-medium tracking-tight text-primary mb-4 max-w-3xl">
        {headline}
      </h2>
      <p className="text-sm text-secondary mb-8 max-w-2xl leading-relaxed">
        {subline}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {buttons.map((b, i) => (
          <button
            key={b.action}
            onClick={() => {
              /* Day-2 wiring */
            }}
            className={
              i === 0
                ? "text-sm font-medium px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                : "text-sm text-secondary px-4 py-2 rounded-md hover:bg-card-border transition-colors"
            }
          >
            {b.label}
          </button>
        ))}
      </div>
    </section>
  );
}
