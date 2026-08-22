/**
 * LastClass domain model.
 *
 * The learner model is the spine: every concept carries a live mastery value
 * that only ever moves as a result of something the learner did — answering a
 * character's doubt, passing a rung check, or fumbling a practical task.
 */

export type TopicType = "THEORY" | "PRACTICAL" | "HYBRID";

export type LearnerLevel = "BASIC" | "MEDIUM" | "ADVANCED";

/**
 * How deep the explanation should be pitched. Gravity for a curious
 * ten-year-old and gravity for an undergraduate are different curricula,
 * not the same curriculum at different speeds — so this drives which
 * concepts appear at all, not just the wording.
 */
export const LEVEL_CHOICES: {
  value: LearnerLevel;
  label: string;
  /** Short anchor shown inside the button — must stay on one line. */
  anchor: string;
  /** Full sentence, shown only for the current selection. */
  detail: string;
}[] = [
  {
    value: "BASIC",
    label: "Basic",
    anchor: "Age 10",
    detail:
      "Everyday words, nothing to memorise and no formulas — the way you'd explain it to a curious ten-year-old.",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    anchor: "High school",
    detail:
      "Real terminology and simple equations, covering the parts students usually get wrong.",
  },
  {
    value: "ADVANCED",
    label: "Advanced",
    anchor: "University",
    detail:
      "Full rigour — formal definitions, edge cases and the subtleties that separate working knowledge from mastery.",
  },
];

export type Rung = "Remember" | "Understand" | "Internalize" | "Apply" | "Teach";

export const RUNGS: Rung[] = [
  "Remember",
  "Understand",
  "Internalize",
  "Apply",
  "Teach",
];

/** Plain-language name for each rung — what the learner actually does. */
export const RUNG_LABEL: Record<Rung, string> = {
  Remember: "Watch",
  Understand: "Compare",
  Internalize: "Picture",
  Apply: "Do",
  Teach: "Teach",
};

/** One plain sentence explaining what happens at this level. */
export const RUNG_BLURB: Record<Rung, string> = {
  Remember: "Watch it explained on a whiteboard.",
  Understand: "See it compared to something you already know.",
  Internalize: "Close your eyes and picture how it works.",
  Apply: "Try it yourself and get it checked.",
  Teach: "Explain it to a class and answer their questions.",
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
  /** What the learner said their level was. */
  statedLevel: LearnerLevel;
  /** What their writing sample actually showed, if they gave one. */
  detectedLevel?: LearnerLevel;
  /** Why the sample was read that way — shown back to the learner. */
  levelEvidence?: string;
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
