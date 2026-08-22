/**
 * LastClass domain model.
 *
 * The learner model is the spine: every concept carries a live mastery value
 * that only ever moves as a result of something the learner did — answering a
 * character's doubt, passing a rung check, or fumbling a practical task.
 */

export type TopicType = "THEORY" | "PRACTICAL" | "HYBRID";

export type Rung = "Remember" | "Understand" | "Internalize" | "Apply" | "Teach";

export const RUNGS: Rung[] = [
  "Remember",
  "Understand",
  "Internalize",
  "Apply",
  "Teach",
];

/** What each rung actually does to the learner, in the learner's words. */
export const RUNG_BLURB: Record<Rung, string> = {
  Remember: "See it drawn out, piece by piece.",
  Understand: "Meet it again in a world you already know.",
  Internalize: "Close your eyes and walk through it.",
  Apply: "Stop reading. Do it, and show your work.",
  Teach: "Explain it to a room that will not let it slide.",
};

export type ConceptStatus = "locked" | "active" | "weak" | "mastered";

export interface Concept {
  id: string;
  name: string;
  /** One line on why this concept exists in the graph. */
  gist: string;
  /** ids of concepts that must come first — drives the graph layout. */
  prereqs: string[];
  /** 0..1, moved only by real learner evidence. */
  mastery: number;
  status: ConceptStatus;
}

export interface Level {
  n: number;
  rung: Rung;
  /** Title Gemini gave this rung for this specific topic. */
  title: string;
  conceptIds: string[];
  unlocked: boolean;
  passed: boolean;
}

export interface Session {
  id: string;
  topic: string;
  topicType: TopicType;
  /** The learner's interest domain — every analogy is transposed into it. */
  interest: string;
  concepts: Concept[];
  levels: Level[];
  createdAt: number;
}

/** Learner profile, persisted so the knowledge state genuinely evolves. */
export interface Profile {
  name: string;
  email: string;
  interest: string;
}

export const MASTERY_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

/** Maps a 0..1 mastery to one of the five ember-ramp tokens. */
export function masteryToken(mastery: number): string {
  const i = Math.min(4, Math.max(0, Math.round(mastery * 4)));
  return `var(--mastery-${i})`;
}

export function statusOf(mastery: number, unlocked: boolean): ConceptStatus {
  if (!unlocked) return "locked";
  if (mastery >= 0.8) return "mastered";
  if (mastery > 0 && mastery < 0.4) return "weak";
  return "active";
}

/**
 * Topological depth of each concept, used to lay the graph out in columns.
 * Deterministic — no force simulation, so the graph never jitters on stage.
 */
export function conceptDepths(concepts: Concept[]): Map<string, number> {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const depth = new Map<string, number>();

  const walk = (id: string, seen: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (seen.has(id)) return 0; // cycle guard — Gemini output is not trusted to be acyclic
    seen.add(id);
    const c = byId.get(id);
    if (!c || c.prereqs.length === 0) {
      depth.set(id, 0);
      return 0;
    }
    const d =
      1 +
      Math.max(...c.prereqs.map((p) => (byId.has(p) ? walk(p, seen) : -1)));
    depth.set(id, d);
    return d;
  };

  concepts.forEach((c) => walk(c.id, new Set()));
  return depth;
}
