import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import "server-only";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_MODEL = "gemini-3.1-flash-image";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const Body = z.object({
  subject: z.string().trim().min(3).max(240),
});

/**
 * One chalk drawing for a beat of the board.
 *
 * Rendered in the same palette as the board itself so it reads as part of the
 * lesson rather than a pasted-in illustration. Purely enrichment — the SVG
 * diagram carries the logic, so a failure here is silent.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const prompt = `A single loose chalk drawing on a dark green blackboard, as a teacher would
sketch mid-lesson while explaining.

Subject: ${parsed.data.subject}. Simple, recognisable, drawn quickly.

Style: white and pale-yellow chalk lines on a dark green chalkboard surface. Loose
confident strokes with visible chalk texture and slightly uneven lines. Flat, no
perspective tricks, no shading beyond simple hatching.

CRITICAL: no text, no letters, no numbers, no labels, no arrows, no borders or
frames. Just the drawn subject on the blackboard, centred, with generous empty
board around it.`;

  try {
    const res = await fetch(`${BASE}/${IMAGE_MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok) throw new Error(`image ${res.status}`);

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData,
    )?.inlineData;
    if (!inline) throw new Error("no image");

    return NextResponse.json({
      image: `data:${inline.mimeType};base64,${inline.data}`,
    });
  } catch (err) {
    console.error("[sketch]", err);
    return NextResponse.json({ error: "No sketch" }, { status: 502 });
  }
}
