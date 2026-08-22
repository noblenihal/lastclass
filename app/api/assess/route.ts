import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, generateJSON } from "@/lib/gemini";
import { DEPTH_RULE } from "@/lib/context";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(1).max(160),
  mode: z.enum(["CAMERA", "DIAGNOSE"]),
  brief: z.string().trim().min(1).max(1200),
  artifact: z.string().trim().max(4000),
  rubric: z.array(z.string().trim().max(200)).max(6),
  level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]).default("MEDIUM"),
  /** DIAGNOSE: what they wrote. CAMERA: an optional caption. */
  answer: z.string().trim().max(4000).optional(),
  /** CAMERA: a data URL of the photo they took. */
  image: z.string().max(12_000_000).optional(),
});

const schema = {
  type: "object",
  properties: {
    passed: { type: "boolean" },
    score: { type: "number" },
    /** Per-rubric-line verdict, so feedback is specific rather than vague. */
    rubric_results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          line: { type: "string" },
          met: { type: "boolean" },
          note: { type: "string" },
        },
        required: ["line", "met", "note"],
      },
    },
    /** The single step that went wrong — the most useful thing we can say. */
    failed_step: { type: "string" },
    feedback: { type: "string" },
  },
  required: ["passed", "score", "rubric_results", "failed_step", "feedback"],
};

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }
  const { topic, mode, brief, artifact, rubric, level, answer, image } =
    parsed.data;

  if (mode === "CAMERA" && !image) {
    return NextResponse.json(
      { error: "Add a photo of your attempt first." },
      { status: 400 },
    );
  }
  if (mode === "DIAGNOSE" && !answer) {
    return NextResponse.json(
      { error: "Write what you think is wrong first." },
      { status: 400 },
    );
  }

  // data:image/jpeg;base64,XXXX  →  { mimeType, data }
  let images: { mimeType: string; data: string }[] | undefined;
  if (image) {
    const m = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) {
      return NextResponse.json(
        { error: "That image format isn't supported. Try a JPEG or PNG." },
        { status: 400 },
      );
    }
    images = [{ mimeType: m[1], data: m[2] }];
  }

  try {
    const verdict = await generateJSON<{
      passed: boolean;
      score: number;
      rubric_results: { line: string; met: boolean; note: string }[];
      failed_step: string;
      feedback: string;
    }>({
      system:
        "You grade practical work for LastClass. You are a fair, specific " +
        `examiner working at ${level} depth. ${DEPTH_RULE[level]} ` +
        "Judge only what is actually in front of you — never assume the " +
        "learner did something you cannot see or read. Being kind about work " +
        "that would fail in reality helps nobody.",
      images,
      prompt: `Topic: "${topic}"

The task they were set:
${brief}

${
  mode === "CAMERA"
    ? `They were asked to make and photograph: ${artifact}

Their photograph is attached. Grade what is visibly in the image.
${answer ? `They added this note: "${answer}"` : ""}

If the photo does not show the requested artefact at all — it is blank, a
screenshot, an unrelated object, or too unclear to judge — set passed=false
and say plainly in feedback that you cannot see the work, rather than
inventing a grade.`
    : `They were given this flawed example to diagnose:
"""
${artifact}
"""

Their diagnosis:
"""
${answer}
"""

They pass only if they identified the actual substantive flaw. Spotting a
cosmetic or irrelevant issue is not a pass.`
}

Grade against each rubric line:
${rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Return:
- rubric_results: one entry per line above, in order — met true/false plus a
  short note pointing at the specific evidence.
- passed: true only if the substantive lines are met.
- score: 0 to 1.
- failed_step: name the ONE thing that went wrong, concretely. Empty string if
  they passed.
- feedback: two or three sentences, addressed as "you", telling them what to
  change. No praise padding.`,
      schema,
      temperature: 0.4,
    });

    return NextResponse.json({
      ...verdict,
      score: Math.min(1, Math.max(0, verdict.score)),
    });
  } catch (err) {
    console.error("[assess]", err);
    const { body, status } = errorResponse(
      err,
      "Could not grade that submission. Try again.",
    );
    return NextResponse.json(body, { status });
  }
}
