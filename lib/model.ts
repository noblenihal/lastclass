/**
 * The learner model.
 *
 * Every mastery change in the app funnels through here. It is deliberately
 * pure and separate from the React store: this is the one place where a
 * silent bug would corrupt what the app claims to know about a learner, so it
 * needs to be testable on its own.
 */

import { statusOf, type Concept, type Level, type Session } from "./types";

/** Mastery only ever moves on evidence, and only ever within 0..1. */
export function nudge(concepts: Concept[], conceptId: string, delta: number): Concept[] {
  if (!Number.isFinite(delta)) return concepts;
  return concepts.map((c) => {
    if (c.id !== conceptId) return c;
    const mastery = Math.min(1, Math.max(0, c.mastery + delta));
    return { ...c, mastery, status: statusOf(mastery, true) };
  });
}

/** Marks a rung passed and opens the next one. */
export function pass(levels: Level[], n: number): Level[] {
  return levels.map((l) =>
    l.n === n
      ? { ...l, passed: true }
      : l.n === n + 1
        ? { ...l, unlocked: true }
        : l,
  );
}

/** The concepts the class should interrogate: weakest first. */
export function weakest(session: Session, n = 3): Concept[] {
  return [...session.concepts].sort((a, b) => a.mastery - b.mastery).slice(0, n);
}

/** The single number the header reports. */
export function overallMastery(concepts: Concept[]): number {
  if (!concepts.length) return 0;
  return concepts.reduce((s, c) => s + c.mastery, 0) / concepts.length;
}

/**
 * What an answer is worth.
 *
 * A correct answer scales with how well it was given; one the learner needed
 * the Master for is worth half, so taking a hint is recorded rather than free.
 * A wrong answer costs, which is what stops guessing being cost-free.
 */
export function answerDelta(opts: {
  resolved: boolean;
  quality: number;
  assisted?: boolean;
}): number {
  if (!opts.resolved) return -0.14;
  const q = Math.min(1, Math.max(0, Number(opts.quality) || 0));
  return (0.22 + q * 0.18) * (opts.assisted ? 0.5 : 1);
}
