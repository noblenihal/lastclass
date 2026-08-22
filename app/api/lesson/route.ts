import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, generateJSON } from "@/lib/gemini";
import { learnerContext } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(1).max(160),
  rung: z.enum(["Remember", "Understand", "Internalize", "Apply"]),
  topicType: z.enum(["THEORY", "PRACTICAL", "HYBRID"]).default("THEORY"),
  level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).default("MEDIUM"),
  detectedLevel: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).optional(),
  interest: z.string().trim().max(80).optional(),
  concepts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        gist: z.string(),
        mastery: z.number(),
      }),
    )
    .min(1)
    .max(12),
});

/** Every rung ends the same way: a check that moves the learner model. */
const CHECK = {
  type: "object",
  properties: {
    question: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    correct_index: { type: "integer" },
    why: { type: "string" },
    concept_id: { type: "string" },
  },
  required: ["question", "options", "correct_index", "why", "concept_id"],
};

const SCHEMAS = {
  Remember: {
    type: "object",
    properties: {
      headline: { type: "string" },
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            concept_id: { type: "string" },
            label: { type: "string" },
            detail: { type: "string" },
            narration: { type: "string" },
            figure: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: ["flow", "stack", "cycle", "split", "compare", "layers"],
                },
                nodes: { type: "array", items: { type: "string" } },
                caption: { type: "string" },
              },
              required: ["kind", "nodes", "caption"],
            },
          },
          required: ["concept_id", "label", "detail", "narration", "figure"],
        },
      },
      check: CHECK,
    },
    required: ["headline", "beats", "check"],
  },
  Understand: {
    type: "object",
    properties: {
      headline: { type: "string" },
      premise: { type: "string" },
      mapping: {
        type: "array",
        items: {
          type: "object",
          properties: {
            concept_id: { type: "string" },
            concept_side: { type: "string" },
            analogy_side: { type: "string" },
            note: { type: "string" },
          },
          required: ["concept_id", "concept_side", "analogy_side", "note"],
        },
      },
      breaks_down: { type: "string" },
      check: CHECK,
    },
    required: ["headline", "premise", "mapping", "breaks_down", "check"],
  },
  Internalize: {
    type: "object",
    properties: {
      headline: { type: "string" },
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            concept_id: { type: "string" },
            narration: { type: "string" },
            cue: { type: "string" },
            prompt: { type: "string" },
            answer: { type: "string" },
          },
          required: ["concept_id", "narration", "cue", "prompt", "answer"],
        },
      },
      check: CHECK,
    },
    required: ["headline", "scenes", "check"],
  },
  Apply: {
    type: "object",
    properties: {
      mode: { type: "string", enum: ["CAMERA", "DIAGNOSE"] },
      headline: { type: "string" },
      brief: { type: "string" },
      /** CAMERA: what to photograph. DIAGNOSE: the broken artefact. */
      artifact: { type: "string" },
      rubric: { type: "array", items: { type: "string" } },
      concept_id: { type: "string" },
    },
    required: ["mode", "headline", "brief", "artifact", "rubric", "concept_id"],
  },
} as const;

const PROMPTS: Record<string, string> = {
  Remember: `Rung 1 of 5 — REMEMBER. The learner has every crutch available: the board
is in front of them and nothing is being tested yet. This is exposure — show
them the shape of the idea, in order, clearly.

Script a whiteboard walkthrough. A teacher is DRAWING while they talk, so
every beat must have something worth drawing.

- headline: what gets written at the top of the board. Under 6 words.
- beats: EXACTLY ONE PER CONCEPT listed above, in prerequisite order
  (foundations first). Never skip a concept and never merge two.
  · concept_id — one of the ids above
  · label — what is written above the drawing. 2 to 5 words, no punctuation.
  · detail — one short line under it. Under 12 words.
  · narration — what the teacher SAYS while drawing it. Two or three
    sentences of natural spoken English. It must describe what is appearing
    on the board as it appears, and connect to the beat before, so the board
    builds an argument rather than a list.
  · figure — the diagram drawn for this beat. Pick the kind that genuinely
    fits the idea; do not default to "flow" for everything:
      flow    — a sequence of steps, left to right (a process, a pipeline)
      stack   — items piling up and unwinding vertically (a call stack, layers
                of history, anything last-in-first-out)
      cycle   — a loop that returns to its start (a feedback loop, a cycle)
      split   — one thing branching into two outcomes (a decision, a fork)
      compare — two things set side by side (before/after, right/wrong)
      layers  — things nested inside each other (scopes, containment)
    nodes — 2 to 5 very short labels, in order, each 1-4 words. These are the
    words drawn INSIDE the shapes, so they must be short enough to fit.
    caption — one short line under the drawing explaining what it shows.`,

  Understand: `Rung 2 of 5 — UNDERSTAND. The learner has seen the shape; now it has to
connect to something they already own. Build the whole topic as one sustained
analogy drawn from their interest domain.

- headline: names the analogy. Under 8 words.
- premise: one or two sentences setting up the comparison.
- mapping: one row per concept — concept_side (the real thing, 2-6 words),
  analogy_side (its counterpart in their world, 2-6 words), note (one line on
  why the pairing holds).
- breaks_down: one honest sentence on where the analogy STOPS being true. Every
  analogy leaks; naming the leak is what stops it becoming a misconception.

If no interest domain was given, use an everyday domain any adult would know,
and say which one you chose in the premise.`,

  Internalize: `Rung 3 of 5 — INTERNALIZE. The page is taken away. The learner closes their
eyes and walks the idea in their head, so it can be recalled without notes.
This is NOT a passive recording. The whole point is that THEY build the
picture in their own head — at every scene they stop, look at what they are
imagining, and describe it aloud. The guide then steers their image. Nothing
here is a quiz; it is guided visualisation.

- headline: under 6 words.
- scenes: 4 to 6, in order. Each is spoken aloud to someone with their eyes
  closed:
  · narration — calm, second-person, present tense, unhurried. Two to four
    sentences. Build a picture they can hold and MOVE through; never just
    restate a definition. Do not repeat "imagine that" every scene.
  · prompt — asked immediately after the narration, with their eyes still
    closed. It must ask them to LOOK at the picture they are holding and say
    what they see — its shape, its colour, which way it is moving, what is
    happening at its edges. Never a definition or recall question, and never
    a right-or-wrong question. The point is to make them actually render the
    image, because a picture you have described is one you can retrieve.
    Good: "Look at the thing you are holding — what shape is it, and which
    way is it moving?" Bad: "What is the definition of momentum?"
  · answer — what the guide says once they have described it. Take their
    image seriously: confirm the parts that are right, and gently correct the
    parts of their picture that would mislead them later. Same calm voice,
    one or two sentences, still second-person, still eyes closed.
  · cue — three or four words naming the image, used afterwards as a memory
    anchor. These get shuffled and re-ordered by the learner at the end, so
    each cue must be distinct and concrete, and the ORDER must matter.
  · concept_id — the concept this scene fixes.`,

  Apply: `Rung 4 of 5 — APPLY. Reading stops here. The learner has to do something and
be judged on the result.

Choose the mode honestly:
- CAMERA if the topic has a physical artefact the learner could make and
  photograph with a phone — a knot, a circuit, a drawing, a diagram they
  sketch, a plated dish, a hand position, worked-out equations on paper.
  artifact = exactly what they must photograph.
- DIAGNOSE if it does not. Then artifact = a broken worked example, written
  out in full, containing exactly one substantive flaw for them to find.
  Make it plausible and confident-sounding, never obviously wrong.

- headline: names the task. Under 7 words.
- brief: what to do, in two or three sentences, addressed as "you".
- rubric: 3 to 4 things a correct result must show. Each under 12 words.
  These are what the submission is graded against.`,
};

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, rung, topicType, level, detectedLevel, interest, concepts } =
    parsed.data;

  try {
    const payload = await generateJSON<Record<string, unknown>>({
      system:
        "You build one rung of a five-rung learning ladder for LastClass. " +
        "Each rung tests the same knowledge with one more crutch removed. " +
        "You are specific and you never pad — no filler, no restating the " +
        "brief back, no encouragement.",
      prompt: `${learnerContext({
        topic,
        level,
        detectedLevel,
        interest,
        concepts,
      })}

Topic type: ${topicType}.

${PROMPTS[rung]}

${
  rung === "Apply"
    ? "concept_id must be one of the ids above."
    : `- check: one multiple-choice question at the end. It must test whether they
  followed THIS rung — how two parts connect — not recall of a definition.
  Exactly 4 options, one correct, correct_index 0-based, 'why' explaining the
  answer in one sentence, concept_id naming what it tests.`
}`,
      schema: SCHEMAS[rung] as unknown as Record<string, unknown>,
      temperature: 0.8,
    });

    const validIds = new Set(concepts.map((c) => c.id));
    const fix = (id: unknown) =>
      typeof id === "string" && validIds.has(id) ? id : concepts[0].id;

    // Reconcile ids and clamp indices — model output is never trusted raw.
    for (const key of ["beats", "mapping", "scenes"]) {
      const arr = payload[key];
      if (Array.isArray(arr)) {
        payload[key] = arr.map((x: Record<string, unknown>) => ({
          ...x,
          concept_id: fix(x.concept_id),
        }));
      }
    }
    if (payload.concept_id) payload.concept_id = fix(payload.concept_id);

    const check = payload.check as Record<string, unknown> | undefined;
    if (check) {
      const options = Array.isArray(check.options)
        ? (check.options as string[]).slice(0, 4)
        : [];
      payload.check = {
        ...check,
        options,
        concept_id: fix(check.concept_id),
        correct_index: Math.min(
          Math.max(0, Number(check.correct_index) || 0),
          Math.max(0, options.length - 1),
        ),
      };
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[lesson]", err);
    const { body, status } = errorResponse(
      err,
      "Could not build this level. Try again.",
    );
    return NextResponse.json(body, { status });
  }
}
