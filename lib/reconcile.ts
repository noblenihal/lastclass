/**
 * The trust boundary for model output.
 *
 * Schema-constrained generation guarantees the SHAPE of a response, never its
 * meaning: Gemini can still name a concept id that does not exist, return a
 * correct_index past the end of the options it gave, or hand back a severity
 * outside the range. Every generated payload passes through here before it is
 * allowed anywhere near the learner model.
 */

/** Keeps an id only if it names something real; otherwise falls back. */
export function resolveId(
  id: unknown,
  valid: Set<string>,
  fallback: string,
): string {
  return typeof id === "string" && valid.has(id) ? id : fallback;
}

/** Clamps to an integer inside [min, max], tolerating junk input. */
export function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export interface RawCheck {
  question?: string;
  options?: unknown;
  correct_index?: unknown;
  why?: string;
  concept_id?: unknown;
}

export interface SafeCheck {
  question: string;
  options: string[];
  correct_index: number;
  why: string;
  concept_id: string;
}

/**
 * A multiple-choice check is only safe once the answer index actually points
 * at one of the options — otherwise the learner can never be right.
 */
export function reconcileCheck(
  raw: RawCheck | undefined,
  valid: Set<string>,
  fallbackConcept: string,
): SafeCheck | null {
  if (!raw) return null;
  const options = Array.isArray(raw.options)
    ? raw.options.filter((o): o is string => typeof o === "string").slice(0, 4)
    : [];
  if (options.length < 2) return null;

  return {
    question: raw.question ?? "",
    options,
    correct_index: clampInt(raw.correct_index, 0, options.length - 1),
    why: raw.why ?? "",
    concept_id: resolveId(raw.concept_id, valid, fallbackConcept),
  };
}

/** Rewrites every concept_id in a generated list to one that exists. */
export function reconcileIds<T extends { concept_id?: unknown }>(
  items: T[] | undefined,
  valid: Set<string>,
  fallback: string,
): T[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    concept_id: resolveId(item.concept_id, valid, fallback),
  }));
}

/** Drops self-references and prerequisites naming concepts that do not exist. */
export function reconcilePrereqs(
  prereqs: unknown,
  selfId: string,
  valid: Set<string>,
): string[] {
  if (!Array.isArray(prereqs)) return [];
  return prereqs.filter(
    (p): p is string => typeof p === "string" && p !== selfId && valid.has(p),
  );
}

/** 0-100 from the model becomes a 0..1 mastery, junk becomes zero. */
export function toMastery(percent: unknown): number {
  const n = Number(percent);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n / 100));
}
