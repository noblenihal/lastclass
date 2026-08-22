import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/gemini";
import { DEPTH_RULE } from "@/lib/context";
import type { MentorNote } from "@/lib/characters";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(1).max(160),
  question: z.string().trim().min(1).max(600),
  lookingFor: z.string().trim().min(1).max(600),
  level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).default("MEDIUM"),
  interest: z.string().trim().max(80).default("everyday life"),
  /** What the learner already said, so the Master fills the gap, not the lot. */
  transcript: z.string().trim().max(6000).optional(),
});

const schema = {
  type: "object",
  properties: {
    answer: { type: "string" },
    key_points: { type: "array", items: { type: "string" } },
    watch_out: { type: "string" },
  },
  required: ["answer", "key_points", "watch_out"],
};

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, question, lookingFor, level, interest, transcript } =
    parsed.data;

  try {
    const raw = await generateJSON<{
      answer: string;
      key_points: string[];
      watch_out: string;
    }>({
      system:
        "You are the Master, the mentor at the back of a classroom. A learner " +
        "is teaching a topic and got stuck on a student's question. You do " +
        "not answer the student — you teach the LEARNER, quickly and clearly, " +
        "so they can turn round and explain it themselves. " +
        "You are warm, direct, and you never pad.",
      prompt: `Topic being taught: "${topic}"
Depth register: ${level}. ${DEPTH_RULE[level]}
The learner's interest domain is "${interest}" — use it for an analogy if one
genuinely helps, otherwise don't force it.

The student asked: "${question}"
A satisfying answer needs to contain: ${lookingFor}
${
  transcript
    ? `\nWhat the learner had already said (fill the gap in this, don't repeat
what they already got right):\n"""\n${transcript}\n"""`
    : ""
}

Give them:

- answer: the explanation, in plain prose at the depth register above. Around
  60-110 words. Teach the idea itself, not a script to parrot — they have to
  say it in their own words afterwards.
- key_points: 2 to 4 short bullets naming what their answer must actually
  hit. Each under 12 words.
- watch_out: the single thing people most often get wrong here, in one
  sentence.

Address the learner directly as "you". Never address the student.`,
      schema,
      temperature: 0.6,
    });

    const note: MentorNote = {
      answer: raw.answer,
      keyPoints: (raw.key_points ?? []).slice(0, 4),
      watchOut: raw.watch_out,
    };
    return NextResponse.json(note);
  } catch (err) {
    console.error("[mentor]", err);
    return NextResponse.json(
      { error: "The Master is thinking. Try again." },
      { status: 502 },
    );
  }
}
