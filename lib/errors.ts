/**
 * The failure taxonomy.
 *
 * Kept out of gemini.ts and away from the server-only guard because these are
 * plain value objects — they describe what went wrong and what the learner
 * should be told, which is logic worth testing on its own.
 */

export type GeminiFailure =
  | "blocked" // refused on safety/policy grounds
  | "recitation" // output would reproduce protected material
  | "rate_limited" // too many requests, or quota exhausted
  | "timeout"
  | "config"
  | "unavailable" // upstream 5xx
  | "unknown";

/**
 * A failure we can explain to the learner.
 *
 * Telling someone "try again" after a policy refusal is worse than useless —
 * they'll retry something that can never succeed. Every failure carries a
 * reason the UI can show verbatim, and `retryable` says whether trying the
 * same thing again could possibly work.
 */
export class GeminiError extends Error {
  readonly kind: GeminiFailure;
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(kind: GeminiFailure, userMessage: string, detail?: string) {
    super(detail ?? userMessage);
    this.name = "GeminiError";
    this.kind = kind;
    this.userMessage = userMessage;
    this.retryable = kind === "timeout" || kind === "unavailable" ||
      kind === "rate_limited";
  }
}

/** Human names for Gemini's safety categories. */
const CATEGORY_LABEL: Record<string, string> = {
  HARM_CATEGORY_HARASSMENT: "harassment",
  HARM_CATEGORY_HATE_SPEECH: "hate speech",
  HARM_CATEGORY_SEXUALLY_EXPLICIT: "sexually explicit content",
  HARM_CATEGORY_DANGEROUS_CONTENT: "dangerous content",
  HARM_CATEGORY_CIVIC_INTEGRITY: "civic integrity",
};

interface SafetyRating {
  category?: string;
  probability?: string;
  blocked?: boolean;
}

/** Turns a block into a sentence naming what actually tripped. */
export function describeBlock(
  reason: string | undefined,
  ratings: SafetyRating[] | undefined,
): string {
  const tripped = (ratings ?? [])
    .filter(
      (r) =>
        r.blocked ||
        r.probability === "HIGH" ||
        r.probability === "MEDIUM",
    )
    .map((r) => CATEGORY_LABEL[r.category ?? ""] ?? null)
    .filter(Boolean) as string[];

  if (tripped.length) {
    return (
      `Gemini's safety filters declined this one — it was flagged for ` +
      `${tripped.join(" and ")}. Try rephrasing it, or pick a different angle ` +
      `on the subject.`
    );
  }
  if (reason === "PROHIBITED_CONTENT" || reason === "BLOCKLIST") {
    return (
      "Gemini declined to generate anything for this topic under its content " +
      "policy. Rewording won't help — try a different subject."
    );
  }
  return (
    "Gemini's safety filters declined this request. Try rephrasing the topic, " +
    "or pick a different one."
  );
}

/** Maps any thrown error to the shape our route handlers return. */
export function errorResponse(err: unknown, fallback: string) {
  // A deliberate refusal from a handler carries its own status and reason.
  if (
    err &&
    typeof err === "object" &&
    "name" in err &&
    (err as { name?: string }).name === "RouteRefusal"
  ) {
    const r = err as unknown as {
      message: string;
      kind: string;
      status: number;
      retryable: boolean;
    };
    return {
      body: { error: r.message, kind: r.kind, retryable: r.retryable },
      status: r.status,
    };
  }

  if (err instanceof GeminiError) {
    return {
      body: {
        error: err.userMessage,
        kind: err.kind,
        retryable: err.retryable,
      },
      status: err.kind === "blocked" || err.kind === "recitation" ? 422 : 502,
    };
  }
  return {
    body: { error: fallback, kind: "unknown" as const, retryable: true },
    status: 502,
  };
}
