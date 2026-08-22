import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import "server-only";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_MODEL = "gemini-3.1-flash-image";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const Body = z.object({
  topic: z.string().trim().min(1).max(160),
  topicType: z.enum(["THEORY", "PRACTICAL", "HYBRID"]).default("THEORY"),
  concepts: z.array(z.string().trim().max(80)).max(8).default([]),
});

/** The room a topic would actually be taught in. */
const SETTING: Record<string, string> = {
  THEORY:
    "a lecture room with a large chalkboard covered in chalk sketches, " +
    "wooden desks and stools",
  PRACTICAL:
    "a hands-on workshop bench room with tools and materials laid out, " +
    "a pinned instruction board on the wall",
  HYBRID:
    "a teaching studio that is half lecture room and half workbench, with " +
    "a chalkboard on one wall and a work surface below it",
};

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, topicType, concepts } = parsed.data;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Prompt discipline: named style, named off-center lighting, explicit
  // negative constraints — otherwise this returns stock-AI-looking rooms.
  const prompt = `A wide, empty classroom backdrop for a lesson about "${topic}".

The room is ${SETTING[topicType]}. Dress the room with objects, diagrams and
chalk sketches that specifically belong to this subject${
    concepts.length
      ? ` — it is being taught alongside: ${concepts.slice(0, 5).join(", ")}`
      : ""
  }. The board and the props must make the subject obvious at a glance.

Style: risograph print, grainy paper texture, limited palette of warm amber
and deep charcoal slate. A single warm lamp off to the left casting angled
light; the right side falls into shadow. Asymmetric composition. Wide 16:9.

Strictly: no people, no animals, no readable words or letters or numbers on
the board — only sketch-like marks and diagrams. No symmetric head-on
composition. No smooth glossy 3D render. No blue-tinted lighting.`;

  try {
    const res = await fetch(
      `${BASE}/${IMAGE_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: AbortSignal.timeout(55_000),
      },
    );
    if (!res.ok) throw new Error(`image ${res.status}`);

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData,
    )?.inlineData;
    if (!inline) throw new Error("no image returned");

    return NextResponse.json({
      image: `data:${inline.mimeType};base64,${inline.data}`,
    });
  } catch (err) {
    console.error("[room]", err);
    // The room is atmosphere, never a blocker — the class runs without it.
    return NextResponse.json({ error: "No backdrop" }, { status: 502 });
  }
}
