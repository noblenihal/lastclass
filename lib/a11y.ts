"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Motion helpers that actually respect the user's preference.
 *
 * The CSS `prefers-reduced-motion` block only reaches CSS animations —
 * Framer Motion drives transforms from JS and ignores it entirely. Every
 * looping animation in this app (raised hands, rocking students, pulsing
 * rings, drawing strokes) has to consult this instead.
 */
export function useMotionSafe() {
  const reduced = useReducedMotion();

  return {
    reduced: Boolean(reduced),

    /** A looping animation, or a still frame when motion is reduced. */
    loop<T extends Record<string, unknown>>(animate: T, still: T): T {
      return reduced ? still : animate;
    },

    /** Repeat count that collapses to none when motion is reduced. */
    repeat(count: number = Infinity): number {
      return reduced ? 0 : count;
    },

    /** Duration that collapses to near-instant when motion is reduced. */
    dur(seconds: number): number {
      return reduced ? 0.01 : seconds;
    },
  };
}

/**
 * Announces async results to assistive tech.
 *
 * Most of what changes in this app arrives from a network call — questions
 * being raised, a verdict, a grade — and none of it moves focus, so without
 * a live region a screen-reader user is told nothing happened.
 */
export function politeProps(): {
  role: "status";
  "aria-live": "polite";
  "aria-atomic": true;
} {
  return { role: "status", "aria-live": "polite", "aria-atomic": true };
}
