"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "./types";
import { nudge, pass, weakest as pickWeakest } from "./model";

const KEY = "lastclass:session";

/**
 * The active learning session, mirrored to localStorage so a mid-demo refresh
 * doesn't wipe the learner model. Everything in here was produced by a real
 * generation call — nothing is seeded.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* unreadable session — start fresh */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Session | null) => {
    setSession(next);
    try {
      if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
      else window.localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable — session stays in memory */
    }
  }, []);

  /** Moves a concept's mastery by a delta. The rules live in model.ts. */
  const nudgeMastery = useCallback(
    (conceptId: string, delta: number) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, concepts: nudge(prev.concepts, conceptId, delta) };
        try {
          window.localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
        return next;
      });
    },
    [],
  );

  /** Marks a rung passed and unlocks the next one. */
  const passLevel = useCallback((n: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, levels: pass(prev.levels, n) };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return { session, ready, setSession: persist, nudgeMastery, passLevel };
}

/** Concepts the learner is shakiest on — drives which doubts the room raises. */
export const weakest = pickWeakest;
