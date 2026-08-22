import type { LearnerLevel } from "./types";

/**
 * The learner context block.
 *
 * Everything inferred at intake — the depth register, the level we actually
 * read out of their writing, their interest domain, and the live mastery
 * state — has to reach every downstream generation, not just the curriculum
 * call. Otherwise the classroom interrogates a ten-year-old with graduate
 * formalism, or explains spacetime curvature via "things falling down".
 *
 * One shared builder keeps that context identical everywhere it is used.
 */

export const DEPTH_RULE: Record<LearnerLevel, string> = {
  BASIC:
    "Everyday words only. No formulas, no symbols, no technical vocabulary. " +
    "If you would need algebra to say it, say it another way or leave it out. " +
    "Aim at a curious 10-year-old.",
  MEDIUM:
    "High-school register. Correct terminology and simple equations are fine, " +
    "but no graduate formalism. Aim at a sharp 16-year-old.",
  ADVANCED:
    "University register. Full rigour, formal vocabulary, edge cases and " +
    "competing models are all fair game. Do not over-explain basics.",
};

export interface LearnerContext {
  topic: string;
  level: LearnerLevel;
  detectedLevel?: LearnerLevel;
  levelEvidence?: string;
  interest?: string;
  concepts: { id: string; name: string; gist: string; mastery: number }[];
}

/** Renders the shared context block injected into every content prompt. */
export function learnerContext(ctx: LearnerContext): string {
  const effective = ctx.detectedLevel ?? ctx.level;
  const mismatch =
    ctx.detectedLevel && ctx.detectedLevel !== ctx.level
      ? `\nNote: they selected ${ctx.level}, but their writing read as ` +
        `${ctx.detectedLevel}. Trust the writing.` +
        (ctx.levelEvidence ? ` Evidence: ${ctx.levelEvidence}` : "")
      : "";

  const known = ctx.concepts
    .filter((c) => c.mastery >= 0.6)
    .map((c) => c.name);
  const shaky = ctx.concepts
    .filter((c) => c.mastery > 0 && c.mastery < 0.4)
    .map((c) => c.name);
  const untouched = ctx.concepts
    .filter((c) => c.mastery === 0)
    .map((c) => c.name);

  return `LEARNER CONTEXT — obey all of this.

Topic: "${ctx.topic}"
Depth register: ${effective}. ${DEPTH_RULE[effective]}${mismatch}

${
  ctx.interest
    ? `Their interest domain is "${ctx.interest}". When an analogy would help,
build it out of that domain rather than a generic one — but never force one
where a plain explanation is clearer.`
    : "They have not named an interest domain. Do not reach for analogies to a hobby you have not been told about."
}

Current state of their knowledge map:
${
  known.length
    ? `- Solid on: ${known.join(", ")}. Do not re-explain these.`
    : "- Nothing is solid yet."
}
${shaky.length ? `- Shaky on: ${shaky.join(", ")}. These are the priority.` : ""}
${untouched.length ? `- No evidence yet on: ${untouched.join(", ")}.` : ""}`.trim();
}
