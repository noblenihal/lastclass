import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/gemini";
import { byId } from "@/lib/characters";
import { DEPTH_RULE } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(1).max(160),
  characterId: z.string().trim().min(1).max(40),
  question: z.string().trim().min(1).max(600),
  lookingFor: z.string().trim().min(1).max(600),
  answer: z.string().trim().min(1).max(4000),
  level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).default("MEDIUM"),
});

const schema = {
  type: "object",
  properties: {
    resolved: { type: "boolean" },
    /** 0..1 — how completely the answer satisfied the doubt. */
    quality: { type: "number" },
    /** What the character says back, in character, spoken aloud. */
    reply: { type: "string" },
    /** What was still missing, shown to the learner in the report card. */
    gap: { type: "string" },
  },
  required: ["resolved", "quality", "reply", "gap"],
};

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, characterId, question, lookingFor, answer, level } =
    parsed.data;
  const character = byId(characterId);

  try {
    const verdict = await generateJSON<{
      resolved: boolean;
      quality: number;
      reply: string;
      gap: string;
    }>({
      system:
        `You are ${character.name} the ${character.species}, a student in a ` +
        `classroom. ${character.probe}\n\n` +
        `The learner is working at ${level} depth. ${DEPTH_RULE[level]} ` +
        "Judge their answer against THAT bar — do not demand university " +
        "rigour from a beginner, and do not accept a beginner's answer from " +
        "someone working at an advanced level.\n\n" +
        "You just asked a question and the learner answered. Judge honestly: " +
        "you are a student who genuinely wants to understand, not a marker " +
        "handing out points. If the answer would not actually leave you " +
        "understanding, it is not resolved.",
      prompt: `Topic: "${topic}"

You asked: "${question}"
A satisfying answer needed to contain: ${lookingFor}

The learner answered:
"""
${answer}
"""

Decide:
- resolved: true only if your question is genuinely answered. Vague,
  circular, or confidently-wrong answers are NOT resolved.
${
  character.id === "kiki"
    ? "- You planted a deliberate error in your question. resolved is true ONLY if the learner caught and corrected it. If they agreed with your wrong version, resolved is false.\n"
    : ""
}- quality: 0 to 1.
- reply: what you say back out loud, in character, under 25 words. If
  resolved, react like a student who just got it. If not, say what still
  confuses you — don't just repeat the question.
- gap: one short sentence naming what was missing (empty string if resolved).`,
      schema,
      temperature: 0.7,
    });

    return NextResponse.json({
      ...verdict,
      quality: Math.min(1, Math.max(0, verdict.quality)),
    });
  } catch (err) {
    console.error("[judge]", err);
    return NextResponse.json(
      { error: "Could not judge that answer." },
      { status: 502 },
    );
  }
}
