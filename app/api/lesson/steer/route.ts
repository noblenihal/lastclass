import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, generateJSON } from "@/lib/gemini";
import { DEPTH_RULE } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(1).max(160),
  /** The scene they were just walked through. */
  scene: z.string().trim().min(1).max(2000),
  /** What the guide asked them to look at. */
  prompt: z.string().trim().min(1).max(600),
  /** What they said they could see. */
  described: z.string().trim().min(1).max(2000),
  level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).default("MEDIUM"),
});

const schema = {
  type: "object",
  properties: {
    /** Spoken back to them, eyes still closed. */
    reply: { type: "string" },
    /** The part of their picture that was right. */
    holds: { type: "string" },
    /** The part that would mislead them later, if any. */
    adjust: { type: "string" },
  },
  required: ["reply", "holds", "adjust"],
};

/**
 * Steers the learner's own mental image.
 *
 * The visualisation is only worth doing if the picture is theirs, so rather
 * than replaying a fixed script we take what they say they can see and adjust
 * it — keeping what is right, correcting what would mislead them later.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, scene, prompt, described, level } = parsed.data;

  try {
    const out = await generateJSON<{
      reply: string;
      holds: string;
      adjust: string;
    }>({
      system:
        "You are guiding someone through a visualisation with their eyes " +
        `closed, learning "${topic}" at ${level} depth. ${DEPTH_RULE[level]} ` +
        "Your voice is calm, slow and warm. You never quiz them and you never " +
        "say right or wrong — you work with the picture they already have.",
      prompt: `The scene you just walked them through:
"""
${scene}
"""

You asked: "${prompt}"

They described what they can see:
"""
${described}
"""

Respond:
- holds: the part of their picture that is accurate and worth keeping. One
  short phrase. Empty string only if nothing they said was usable.
- adjust: the part of their picture that would mislead them later, named
  plainly. Empty string if their image is sound.
- reply: what you say aloud, to someone with their eyes shut. Two or three
  sentences. Use THEIR words and THEIR image — build on what they described
  rather than replacing it. If something needs adjusting, move the picture
  gently ("let that edge soften", "now let it tilt the other way") rather
  than telling them they were wrong. End settled, not with a question.`,
      schema,
      temperature: 0.75,
    });

    return NextResponse.json(out);
  } catch (err) {
    console.error("[steer]", err);
    const { body, status } = errorResponse(err, "Lost the thread. Try again.");
    return NextResponse.json(body, { status });
  }
}
