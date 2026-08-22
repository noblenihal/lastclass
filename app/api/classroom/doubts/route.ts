import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, generateJSON } from "@/lib/gemini";
import { CHARACTERS, type Doubt } from "@/lib/characters";
import { learnerContext } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(1).max(160),
  transcript: z.string().trim().min(1).max(6000),
  learnerName: z.string().trim().max(60).optional(),
  level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).default("MEDIUM"),
  detectedLevel: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).optional(),
  levelEvidence: z.string().trim().max(600).optional(),
  interest: z.string().trim().max(80).default("everyday life"),
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
  /** Questions already asked this class, so the room doesn't repeat itself. */
  asked: z.array(z.string()).max(30).default([]),
});

const schema = {
  type: "object",
  properties: {
    doubts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          character_id: {
            type: "string",
            enum: CHARACTERS.map((c) => c.id),
          },
          question: { type: "string" },
          // Gemini rejects non-string enum members, so this is clamped in code.
          severity: { type: "integer" },
          concept_id: { type: "string" },
          looking_for: { type: "string" },
        },
        required: [
          "character_id",
          "question",
          "severity",
          "concept_id",
          "looking_for",
        ],
      },
    },
  },
  required: ["doubts"],
};

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const {
    topic,
    transcript,
    concepts,
    asked,
    learnerName,
    level,
    detectedLevel,
    levelEvidence,
    interest,
  } = parsed.data;

  // The two signals that decide what the room asks: where the learner is
  // already weak, and what they just failed to say.
  const weak = [...concepts]
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)
    .map((c) => `${c.id} (${c.name}, ${Math.round(c.mastery * 100)}% mastered)`)
    .join("; ");

  const roster = CHARACTERS.map(
    (c) => `- ${c.id} — ${c.name} the ${c.species}. ${c.probe}`,
  ).join("\n");

  try {
    const raw = await generateJSON<{
      doubts: {
        character_id: string;
        question: string;
        severity: 1 | 2 | 3;
        concept_id: string;
        looking_for: string;
      }[];
    }>({
      system:
        "You run the classroom in LastClass. A learner has just explained a " +
        "topic out loud to a room of animal students. Each student probes a " +
        "different failure mode. You generate the doubts they raise. " +
        "You are warm but you do not let weak explanations pass.",
      prompt: `${learnerContext({
        topic,
        level,
        detectedLevel,
        levelEvidence,
        interest,
        concepts,
      })}

The students must pitch their questions at that same depth register — a
class listening to a 10-year-old asks 10-year-old questions.

Topic being taught: "${topic}"
${learnerName ? `The learner's name is ${learnerName}. Characters may address them by name.\n` : ""}
Concepts in the graph:
${concepts.map((c) => `- ${c.id}: ${c.name} — ${c.gist}`).join("\n")}

Where this learner is already weakest: ${weak}

What the learner just said, verbatim:
"""
${transcript}
"""

The room:
${roster}

${asked.length ? `Already asked this class (do NOT repeat these):\n${asked.map((q) => `- ${q}`).join("\n")}\n` : ""}
Raise 3 to 4 doubts. Rules:

- Ground every doubt in what the learner ACTUALLY said (or conspicuously
  failed to say). Quote or reference their own words where you can.
- Prefer concepts from the weak list above — those are the gaps worth probing.
- Each doubt must come from a different character, and must match that
  character's probe style. Kiki must always restate something with one
  plausible error planted in it.
- severity: 1 = a small clarification, 2 = a real gap, 3 = they have
  fundamentally misunderstood something.
- concept_id must be one of the ids listed above.
- looking_for: one sentence describing what a satisfying answer must contain.
- Questions are spoken aloud by a cartoon animal. Keep each under 30 words,
  in character, natural speech. No preamble, no "great explanation!".`,
      schema,
      temperature: 0.9,
    });

    const validIds = new Set(concepts.map((c) => c.id));
    const doubts: Doubt[] = raw.doubts.map((d, i) => ({
      id: `${Date.now()}-${i}`,
      characterId: d.character_id,
      question: d.question,
      severity: Math.min(3, Math.max(1, Math.round(d.severity ?? 1))) as 1 | 2 | 3,
      conceptId: validIds.has(d.concept_id) ? d.concept_id : concepts[0].id,
      lookingFor: d.looking_for,
      status: "raised",
    }));

    return NextResponse.json({ doubts });
  } catch (err) {
    console.error("[doubts]", err);
    const { body, status } = errorResponse(err, "The room went quiet. Try explaining again.");
    return NextResponse.json(body, { status });
  }
}
