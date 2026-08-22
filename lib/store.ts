"use client";

import { useCallback, useEffect, useState } from "react";
import type { Concept, Session } from "./types";
import { statusOf } from "./types";

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

  /** Moves a concept's mastery by a delta, clamped, and recomputes its status. */
  const nudgeMastery = useCallback(
    (conceptId: string, delta: number) => {
      setSession((prev) => {
        if (!prev) return prev;
        const concepts: Concept[] = prev.concepts.map((c) => {
          if (c.id !== conceptId) return c;
          const mastery = Math.min(1, Math.max(0, c.mastery + delta));
          return { ...c, mastery, status: statusOf(mastery, true) };
        });
        const next = { ...prev, concepts };
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
      const levels = prev.levels.map((l) =>
        l.n === n
          ? { ...l, passed: true }
          : l.n === n + 1
            ? { ...l, unlocked: true }
            : l,
      );
      const next = { ...prev, levels };
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
export function weakest(session: Session, n = 3): Concept[] {
  return [...session.concepts].sort((a, b) => a.mastery - b.mastery).slice(0, n);
}
