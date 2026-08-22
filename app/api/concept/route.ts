import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, generateJSON } from "@/lib/gemini";
import { DEPTH_RULE, STAY_IN_DOMAIN } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(1).max(160),
  concept: z.string().trim().min(1).max(120),
  gist: z.string().trim().max(400).optional(),
  level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).default("MEDIUM"),
  interest: z.string().trim().max(80).optional(),
  mastery: z.number().min(0).max(1).default(0),
  /** 0 = the brief, 1+ = each time they asked to go deeper. */
  depth: z.number().int().min(0).max(3).default(0),
  /** What they have already been told, so going deeper adds rather than repeats. */
  already: z.array(z.string().max(2000)).max(4).default([]),
});

const schema = {
  type: "object",
  properties: {
    brief: { type: "string" },
    key_points: { type: "array", items: { type: "string" } },
    /** The misconception people hold about this specific concept. */
    trap: { type: "string" },
    /** False once the concept is genuinely exhausted at this depth. */
    can_go_deeper: { type: "boolean" },
    /** What the next level down would cover, so the button is honest. */
    next_layer: { type: "string" },
  },
  required: ["brief", "key_points", "trap", "can_go_deeper", "next_layer"],
};

const LAYER = [
  "Give the plain explanation — what it is and why it exists.",
  "Go a layer deeper: the mechanism. How it actually works, step by step.",
  "Go deeper still: the edge cases, the failure modes, and where practitioners disagree.",
  "Deepest useful layer: the subtleties only someone who has really used this would know.",
];

/**
 * The brief behind a stop on the roadmap.
 *
 * Depth here is the learner pulling, not us pushing — each press of "go
 * deeper" adds a layer rather than restating the last one, and the model is
 * asked to admit when a concept is genuinely exhausted.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, concept, gist, level, interest, mastery, depth, already } =
    parsed.data;

  try {
    const out = await generateJSON<{
      brief: string;
      key_points: string[];
      trap: string;
      can_go_deeper: boolean;
      next_layer: string;
    }>({
      system:
        "You explain one concept from a learner's roadmap, clearly and " +
        "without padding. No preamble, no encouragement, no restating the " +
        "question back.",
      prompt: `Topic: "${topic}"
This stop on the roadmap: "${concept}"${gist ? ` — ${gist}` : ""}
Depth register: ${level}. ${DEPTH_RULE[level]}
${STAY_IN_DOMAIN}
${interest ? `Their interest domain is "${interest}" — use it for an analogy only if one genuinely helps.` : ""}
They are ${Math.round(mastery * 100)}% of the way to mastering this stop.

${LAYER[Math.min(depth, LAYER.length - 1)]}

${
  already.length
    ? `They have ALREADY been told the following. Do not repeat any of it —
build past it:
${already.map((a, i) => `[layer ${i}] ${a}`).join("\n\n")}`
    : ""
}

Return:
- brief: the explanation for this layer. 70-130 words, plain prose, second
  person. No headings, no bullets inside it.
- key_points: 2 to 4 bullets, each under 12 words, capturing what must stick.
- trap: the specific thing people get wrong about THIS concept, in one
  sentence.
- can_go_deeper: false only when a further layer would leave this topic's
  domain or start inventing detail. Be honest — not every concept has four
  layers.
- next_layer: a short phrase naming what going deeper would actually cover,
  so the button tells the truth. Empty string if can_go_deeper is false.`,
      schema,
      temperature: 0.7,
    });

    return NextResponse.json({
      ...out,
      keyPoints: (out.key_points ?? []).slice(0, 4),
      canGoDeeper: Boolean(out.can_go_deeper) && depth < 3,
      nextLayer: out.next_layer,
    });
  } catch (err) {
    console.error("[concept]", err);
    const { body, status } = errorResponse(
      err,
      "Could not open that one. Try again.",
    );
    return NextResponse.json(body, { status });
  }
}
