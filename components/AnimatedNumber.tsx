"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /**
   * Formats the in-flight intermediate value into the rendered string.
   * Default: round to nearest integer.
   */
  format?: (n: number) => string;
  /** Duration of the count animation in ms. */
  durationMs?: number;
}

/**
 * Animates a number between its previous and current value over
 * `durationMs` using ease-out-cubic. No new dependency — uses
 * requestAnimationFrame directly.
 *
 * Short-circuits when `value` is unchanged. Cancels pending RAF on
 * unmount or on new value.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  durationMs = 200,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(value);
  const previousRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = previousRef.current;
    const to = value;
    if (from === to) return;

    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      const current = from + (to - from) * eased;
      setDisplayed(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Snap to current value if we got interrupted by a new edit
      // before the animation finished — avoids stale displayed state.
      previousRef.current = value;
    };
  }, [value, durationMs]);

  return <>{format(displayed)}</>;
}
