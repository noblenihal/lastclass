"use client";

import { useCallback } from "react";
import type { Session } from "./types";
import { nudge, pass, weakest as pickWeakest } from "./model";
import { usePersisted } from "./persisted";

const KEY = "lastclass:session";

/**
 * The active learning session, mirrored to localStorage so a mid-demo refresh
 * doesn't wipe the learner model. Everything in here was produced by a real
 * generation call — nothing is seeded.
 */
export function useSession() {
  const { value: session, set, hydrated } = usePersisted<Session | null>(
    KEY,
    null,
  );

  const persist = useCallback((next: Session | null) => set(next), [set]);

  /** Moves a concept's mastery by a delta. The rules live in model.ts. */
  const nudgeMastery = useCallback(
    (conceptId: string, delta: number) => {
      if (!session) return;
      set({ ...session, concepts: nudge(session.concepts, conceptId, delta) });
    },
    [session, set],
  );

  /** Marks a rung passed and unlocks the next one. */
  const passLevel = useCallback(
    (n: number) => {
      if (!session) return;
      set({ ...session, levels: pass(session.levels, n) });
    },
    [session, set],
  );

  return {
    session,
    ready: hydrated,
    setSession: persist,
    nudgeMastery,
    passLevel,
  };
}

/** Concepts the learner is shakiest on — drives which doubts the room raises. */
export const weakest = pickWeakest;
